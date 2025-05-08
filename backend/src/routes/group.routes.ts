import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroup,
  getGroups,
  getGroupById,
  addMemberToGroup,
  removeMemberFromGroup,
  sendGroupMessage,
  getGroupMessages,
  getGroupDetails,
  deleteGroup,
  leaveGroup,
  updateGroup,
} from "../controllers/group.controller.js";

const router = express.Router();

// Create a group
router.post("/", protectRoute, createGroup);

// Get all groups for the logged-in user
router.get("/", protectRoute, getGroups);

// Get group details with members (more specific route)
router.get("/:id/details", protectRoute, getGroupDetails);

// Get a specific group by id (more general route)
router.get("/:id", protectRoute, getGroupById);

// Add a member to a group
router.post("/:id/add-member", protectRoute, addMemberToGroup);

// Remove a member from a group
router.post("/:id/remove-member", protectRoute, removeMemberFromGroup);

// Send a message to a group
router.post("/:id/message", protectRoute, sendGroupMessage);

// Get all messages for a group
router.get("/:id/messages", protectRoute, getGroupMessages);

// Update a group
router.put("/:id", protectRoute, updateGroup);

// Delete a group (admin only)
router.delete("/:id", protectRoute, deleteGroup);

// Leave a group
router.post("/:id/leave", protectRoute, leaveGroup);

export default router;
