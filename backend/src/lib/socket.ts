import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.frontendUrl as string],
  },
});

// Type definitions
type UserSocketMap = {
  [userId: string]: string;
};

// Used to store online users
const userSocketMap: UserSocketMap = {};

export function getReceiverSocketId(userId: string): string | undefined {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId as string;
  if (userId) {
    userSocketMap[userId] = socket.id;
  }

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Store userId -> socketId mapping on connect
  socket.on("user_connected", (userId: string) => {
    userSocketMap[userId] = socket.id;
  });

  // Remove mapping on disconnect
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    const userId = Object.keys(userSocketMap).find(
      (key) => userSocketMap[key] === socket.id
    );
    if (userId) {
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }
  });

  // 1:1 chat typing events
  socket.on("typing", ({ toUserId }: { toUserId: string }) => {
    const targetSocketId = getReceiverSocketId(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("typing", {
        fromUserId: socket.handshake.query.userId,
      });
    }
  });

  socket.on("stop_typing", ({ toUserId }: { toUserId: string }) => {
    const targetSocketId = getReceiverSocketId(toUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("stop_typing", {
        fromUserId: socket.handshake.query.userId,
      });
    }
  });

  // Group chat typing events
  socket.on("group_typing", ({ groupId }: { groupId: string }) => {
    socket.to(groupId).emit("group_typing", {
      fromUserId: socket.handshake.query.userId,
      groupId,
    });
  });

  socket.on("group_stop_typing", ({ groupId }: { groupId: string }) => {
    socket.to(groupId).emit("group_stop_typing", {
      fromUserId: socket.handshake.query.userId,
      groupId,
    });
  });

  // Join group room
  socket.on("join_group", ({ groupId }: { groupId: string }) => {
    socket.join(groupId);
  });
});

export { io, app, server };
