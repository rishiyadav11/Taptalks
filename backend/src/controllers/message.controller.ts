import { Request, Response } from "express";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { messageSchema, MessageInput } from "../schemas/message.schema.js"; // Import the Zod schema
import { Types } from "mongoose";
import { IMessage } from "../models/message.model.js";
import mongoose from "mongoose";

// Type for Authenticated Request
interface AuthenticatedRequest extends Request {
  user?: {
    _id: Types.ObjectId | string;
  };
}

export const getUsersForSidebar = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const loggedInUserId = req.user?._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    // Get the last message for each user
    const usersWithLastMessage = await Promise.all(
      filteredUsers.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: loggedInUserId, receiverId: user._id },
            { senderId: user._id, receiverId: loggedInUserId },
          ],
        })
          .sort({ createdAt: -1 })
          .populate("senderId", "fullName profilePic")
          .lean();

        return {
          ...user.toObject(),
          lastMessage:
            lastMessage &&
            lastMessage.senderId &&
            typeof lastMessage.senderId === "object" &&
            "fullName" in lastMessage.senderId
              ? {
                  text: lastMessage.text,
                  createdAt: lastMessage.createdAt,
                  senderId: {
                    _id: lastMessage.senderId._id,
                    fullName: lastMessage.senderId.fullName,
                  },
                }
              : undefined,
        };
      })
    );

    res.status(200).json(usersWithLastMessage);
  } catch (error: any) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userToChatId = req.params.id;
    const myId = req.user?._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error: any) {
    console.log("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    // Validate the request body using Zod
    const parsed = messageSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    const { text, image }: MessageInput = parsed.data;
    const receiverId = req.params.id;
    const senderId = req.user?._id;

    let imageUrl: string | undefined;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error: any) {
    console.log("Error in sendMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add or update a reaction
export const reactToMessage = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params; // message id
  const { emoji } = req.body;
  let userId = req.user?._id;

  if (!emoji) {
    res.status(400).json({ error: "Emoji is required" });
    return;
  }
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Ensure userId is always an ObjectId
  if (typeof userId === "string") {
    userId = new mongoose.Types.ObjectId(userId);
  }

  const message = (await Message.findById(id)) as IMessage | null;
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  // Ensure reactions array exists
  if (!message.reactions) {
    message.reactions = [];
  }

  // Remove previous reaction by this user (if any)
  message.reactions = (message.reactions || []).filter(
    (r) => r.user.toString() !== userId.toString()
  );

  // Add new reaction
  message.reactions.push({ emoji, user: userId });
  await message.save();

  res.json(message);
};

// Remove a reaction
export const removeReaction = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params; // message id
  let userId = req.user?._id;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Ensure userId is always an ObjectId
  if (typeof userId === "string") {
    userId = new mongoose.Types.ObjectId(userId);
  }

  const message = (await Message.findById(id)) as IMessage | null;
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  // Ensure reactions array exists
  if (!message.reactions) {
    message.reactions = [];
  }

  message.reactions = (message.reactions || []).filter(
    (r) => r.user.toString() !== userId.toString()
  );
  await message.save();

  res.json(message);
};

export const markMessageAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const messageId = req.params.id;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    // Only mark as read if the user is the receiver
    if (message.receiverId?.toString() !== userId.toString()) {
      res
        .status(403)
        .json({ error: "Not authorized to mark this message as read" });
      return;
    }

    // Use findByIdAndUpdate to update only the status and seenAt fields
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        $set: {
          status: "read",
          seenAt: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedMessage) {
      res.status(404).json({ error: "Message not found" });
      return;
    }

    // Emit socket event for message status update
    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit("message_status_update", {
        messageId: updatedMessage._id,
        status: "read",
      });
    }

    res.status(200).json(updatedMessage);
  } catch (error: any) {
    console.error("Error in markMessageAsRead:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
