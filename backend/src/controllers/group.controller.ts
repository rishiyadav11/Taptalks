import { Request, Response } from "express";
import Group, { IGroup } from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { io } from "../lib/socket.js";
import { Types, Document } from "mongoose";

interface AuthRequest extends Request {
  user?: {
    _id: string;
    email: string;
  };
}

export const createGroup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, members, image } = req.body;
    console.log("Received group creation request:", {
      name,
      membersCount: members?.length,
      hasImage: !!image,
    }); // Debug log

    const admin = req.user?._id;
    if (!name || !members || !Array.isArray(members) || members.length === 0) {
      res.status(400).json({ error: "Name and members are required" });
      return;
    }

    // Upload image to Cloudinary if provided
    let imageUrl =
      "https://img.freepik.com/free-vector/group-young-people-posing-photo_52683-18823.jpg?ga=GA1.1.1092467876.1743869642&semt=ais_hybrid&w=740";
    if (image) {
      try {
        console.log("Uploading image to Cloudinary..."); // Debug log
        const uploadResponse = await cloudinary.uploader.upload(image);
        console.log("Cloudinary upload response:", uploadResponse); // Debug log
        imageUrl = uploadResponse.secure_url;
      } catch (error) {
        console.error("Error uploading image to Cloudinary:", error);
        res.status(500).json({ error: "Failed to upload image" });
        return;
      }
    }

    // Ensure admin is in the members list
    const adminObjId =
      typeof admin === "string"
        ? new (require("mongoose").Types.ObjectId)(admin)
        : admin;
    if (!members.some((m: any) => m.toString() === adminObjId.toString()))
      members.push(adminObjId);

    console.log("Creating group with data:", {
      name,
      membersCount: members.length,
      imageUrl,
    }); // Debug log
    const group = new Group({
      name,
      members,
      admin: adminObjId,
      image: imageUrl,
    });
    await group.save();
    console.log("Group created successfully:", group); // Debug log
    res.status(201).json(group);
  } catch (error: any) {
    console.error("Error in createGroup:", error); // Debug log
    res.status(500).json({ error: error.message });
  }
};

export const getGroups = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const groups = await Group.find({ members: userId })
      .select("name members admin messages createdAt image")
      .populate("members", "fullName email profilePic")
      .populate("admin", "fullName email profilePic");

    // Get the last message for each group
    const groupsWithLastMessage = await Promise.all(
      groups.map(async (group) => {
        const lastMessage = await Message.findOne({ group: group._id })
          .sort({ createdAt: -1 })
          .populate("senderId", "fullName profilePic")
          .lean();

        return {
          ...group.toObject(),
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

    res.status(200).json(groupsWithLastMessage);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getGroupById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const group = await Group.findById(req.params.id)
      .select("name members admin messages createdAt image")
      .populate("members", "fullName email profilePic")
      .populate("admin", "fullName email profilePic");
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    res.status(200).json(group);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const addMemberToGroup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    // Convert both IDs to strings for comparison
    const adminId = group.admin.toString();
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (adminId !== userId) {
      res.status(403).json({ error: "Only admin can add members" });
      return;
    }

    const { memberId } = req.body;
    if (!memberId) {
      res.status(400).json({ error: "memberId is required" });
      return;
    }

    const memberObjId = new Types.ObjectId(memberId);

    if (group.members.some((id) => id.toString() === memberObjId.toString())) {
      res.status(400).json({ error: "Member already in group" });
      return;
    }

    group.members.push(memberObjId);
    await group.save();

    // Fetch the updated group with populated members
    const updatedGroup = await Group.findById(group._id)
      .populate({
        path: "members",
        select: "fullName email profilePic",
      })
      .populate("admin", "fullName email profilePic");

    if (!updatedGroup) {
      res.status(404).json({ error: "Failed to fetch updated group" });
      return;
    }

    res.status(200).json(updatedGroup);
  } catch (error: any) {
    console.error("Error in addMemberToGroup:", error);
    res.status(500).json({ error: error.message });
  }
};

export const removeMemberFromGroup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    // Convert both IDs to strings for comparison
    const adminId = group.admin.toString();
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (adminId !== userId) {
      res.status(403).json({ error: "Only admin can remove members" });
      return;
    }

    const { memberId } = req.body;
    if (!memberId) {
      res.status(400).json({ error: "memberId is required" });
      return;
    }

    const memberObjId = new Types.ObjectId(memberId);

    // Check if trying to remove admin
    if (memberObjId.toString() === adminId) {
      res.status(400).json({ error: "Cannot remove group admin" });
      return;
    }

    group.members = group.members.filter(
      (id) => id.toString() !== memberObjId.toString()
    );
    await group.save();

    // Fetch the updated group with populated members
    const updatedGroup = await Group.findById(group._id)
      .populate({
        path: "members",
        select: "fullName email profilePic",
      })
      .populate("admin", "fullName email profilePic");

    if (!updatedGroup) {
      res.status(404).json({ error: "Failed to fetch updated group" });
      return;
    }

    res.status(200).json(updatedGroup);
  } catch (error: any) {
    console.error("Error in removeMemberFromGroup:", error);
    res.status(500).json({ error: error.message });
  }
};

export const sendGroupMessage = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const groupId = req.params.id;
    const { text, image } = req.body;
    const senderId = req.user?._id;

    // Log complete request data
    console.log("=== Group Message Request Details ===");
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);
    console.log("Request user:", req.user);
    console.log("Request headers:", req.headers);
    console.log("Group ID:", groupId);
    console.log("Message data:", { text, hasImage: !!image });
    console.log("Sender ID:", senderId);
    console.log("===================================");

    // Validate request data
    if (!senderId) {
      console.log("Error: No sender ID found in request");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!text && !image) {
      console.log("Error: Message must contain either text or image");
      res
        .status(400)
        .json({ error: "Message must contain either text or image" });
      return;
    }

    const group = await Group.findById(groupId);
    console.log("Found group:", group ? "Yes" : "No");

    if (!group) {
      console.log("Error: Group not found with ID:", groupId);
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const senderObjId =
      typeof senderId === "string"
        ? new (require("mongoose").Types.ObjectId)(senderId)
        : senderId;
    const isMember = group.members.some(
      (id) => id.toString() === senderObjId.toString()
    );
    console.log("Is sender a member:", isMember);

    if (!isMember) {
      console.log("Error: User is not a member of the group");
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }

    console.log("Creating new message with data:", {
      senderId: senderObjId,
      group: groupId,
      text,
      hasImage: !!image,
    });

    const message = new Message({
      senderId: senderObjId,
      group: groupId,
      text: text?.trim(),
      image,
      receiverId: null,
    });

    console.log("Attempting to save message...");
    const savedMessage = await message.save();
    console.log("Message saved successfully:", savedMessage);

    // Populate sender information
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate("senderId", "fullName profilePic")
      .exec();

    console.log("Updating group with new message...");
    group.messages.push(savedMessage._id as any);
    await group.save();
    console.log("Group updated successfully");

    // Emit the new message to all members in the group
    console.log("Emitting newGroupMessage event to group:", groupId);
    io.to(groupId).emit("newGroupMessage", populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (error: any) {
    console.error("=== Error in sendGroupMessage ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Error details:", error);
    console.error("===============================");

    // Handle validation errors
    if (error.name === "ValidationError") {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: error.message });
  }
};

export const getGroupMessages = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const userObjId =
      typeof userId === "string"
        ? new (require("mongoose").Types.ObjectId)(userId)
        : userId;
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    if (!group.members.some((id) => id.toString() === userObjId.toString())) {
      res.status(403).json({ error: "You are not a member of this group" });
      return;
    }
    const messages = await Message.find({ group: groupId })
      .populate("senderId", "fullName email profilePic")
      .sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getGroupDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    // Find the group and check if user is a member
    const group = await Group.findOne({
      _id: id,
      members: userId,
    }).populate({
      path: "members",
      select: "fullName email profilePic",
    });

    if (!group) {
      res
        .status(404)
        .json({ message: "Group not found or you are not a member" });
      return;
    }

    res.status(200).json(group);
  } catch (error: any) {
    console.error("Error in getGroupDetails:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteGroup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const groupDoc = (await Group.findById(
      req.params.id
    ).exec()) as IGroup | null;
    if (!groupDoc) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    // Convert both IDs to strings for comparison
    const adminId = groupDoc.admin.toString();
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (adminId !== userId) {
      res.status(403).json({ error: "Only admin can delete the group" });
      return;
    }

    // Delete all messages associated with the group
    await Message.deleteMany({ group: groupDoc._id });

    // Delete the group
    await Group.findByIdAndDelete(groupDoc._id);

    // Notify all members that the group has been deleted
    io.to(groupDoc._id.toString()).emit("groupDeleted", {
      groupId: groupDoc._id,
    });

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error: any) {
    console.error("Error in deleteGroup:", error);
    res.status(500).json({ error: error.message });
  }
};

export const leaveGroup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const groupDoc = (await Group.findById(
      req.params.id
    ).exec()) as IGroup | null;
    if (!groupDoc) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Check if user is the admin
    if (groupDoc.admin.toString() === userId) {
      res.status(400).json({
        error:
          "Group admin cannot leave. Please delete the group or transfer admin rights first.",
      });
      return;
    }

    // Remove user from members array
    groupDoc.members = groupDoc.members.filter(
      (id) => id.toString() !== userId
    );
    await groupDoc.save();

    // Notify other members that someone has left
    io.to(groupDoc._id.toString()).emit("memberLeft", {
      groupId: groupDoc._id,
      userId: userId,
    });

    res.status(200).json({ message: "Left group successfully" });
  } catch (error: any) {
    console.error("Error in leaveGroup:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateGroup = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, image } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    // Check if user is admin
    const adminId = group.admin.toString();
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (adminId !== userId) {
      res.status(403).json({ error: "Only admin can update the group" });
      return;
    }

    if (name) group.name = name;
    if (image) {
      try {
        const uploadResponse = await cloudinary.uploader.upload(image, {
          folder: "group_images",
          resource_type: "auto",
        });
        group.image = uploadResponse.secure_url;
      } catch (error) {
        console.error("Error uploading image to Cloudinary:", error);
        res.status(500).json({ error: "Failed to upload image" });
        return;
      }
    }

    await group.save();

    // Fetch the updated group with populated members
    const updatedGroup = await Group.findById(group._id)
      .populate({
        path: "members",
        select: "fullName email profilePic",
      })
      .populate("admin", "fullName email profilePic");

    if (!updatedGroup) {
      res.status(404).json({ error: "Failed to fetch updated group" });
      return;
    }

    // Notify all members about the group update
    io.to(group._id.toString()).emit("groupUpdated", updatedGroup);

    res.status(200).json(updatedGroup);
  } catch (error: any) {
    console.error("Error in updateGroup:", error);
    res.status(500).json({ error: error.message });
  }
};
