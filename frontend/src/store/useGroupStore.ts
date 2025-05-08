import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";

// Define Group and GroupMessage types
type Group = {
  _id: string;
  name: string;
  members: string[];
  admin: string;
  messages: string[];
  createdAt: string;
  lastMessage?: {
    text: string;
    createdAt: string;
    senderId: {
      _id: string;
      fullName: string;
    };
  };
  image?: string;
};

type GroupMessage = {
  _id: string;
  senderId: {
    _id: string;
    fullName: string;
    profilePic?: string;
  };
  group: string;
  text: string;
  createdAt: string;
  image?: string;
  reactions?: { emoji: string; user: string }[];
  status: "sent" | "delivered" | "read";
};

interface GroupStore {
  groups: Group[];
  selectedGroup: Group | null;
  groupMessages: GroupMessage[];
  isGroupsLoading: boolean;
  isGroupMessagesLoading: boolean;

  getGroups: () => Promise<void>;
  getGroupById: (groupId: string) => Promise<void>;
  sendGroupMessage: (
    groupId: string,
    messageData: { text: string; image?: string }
  ) => Promise<void>;
  getGroupMessages: (groupId: string) => Promise<void>;
  setSelectedGroup: (selectedGroup: Group | null) => void;
  createGroup: (
    name: string,
    members: string[],
    image?: string
  ) => Promise<void>;
  subscribeToGroupMessages: (groupId: string) => void;
  unsubscribeFromGroupMessages: () => void;
  updateGroup: (
    groupId: string,
    payload: { name: string; image?: string }
  ) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  markGroupMessageAsRead: (messageId: string) => Promise<void>;
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  groups: [],
  selectedGroup: null,
  groupMessages: [],
  isGroupsLoading: false,
  isGroupMessagesLoading: false,

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      const groups = res.data as Group[];
      // Sort groups by lastMessage createdAt if available, otherwise by group creation date
      const sortedGroups = groups.sort((a, b) => {
        const dateA = a.lastMessage?.createdAt || a.createdAt;
        const dateB = b.lastMessage?.createdAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      set({ groups: sortedGroups });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  getGroupById: async (groupId: string) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}`);
      set({ selectedGroup: res.data as Group });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  sendGroupMessage: async (
    groupId: string,
    messageData: { text: string; image?: string }
  ) => {
    const { groupMessages, groups } = get();
    try {
      const res = await axiosInstance.post(
        `/groups/${groupId}/message`,
        messageData
      );
      const responseData = res.data as Omit<GroupMessage, "status">;
      const newMessage: GroupMessage = {
        ...responseData,
        status: "sent",
      };
      set({ groupMessages: [...groupMessages, newMessage] });

      // Update the group's lastMessage and move it to the top of the list
      const updatedGroups = groups
        .map((group) => {
          if (group._id === groupId) {
            return {
              ...group,
              lastMessage: {
                text: responseData.text,
                createdAt: newMessage.createdAt,
                senderId: {
                  _id: responseData.senderId._id,
                  fullName: responseData.senderId.fullName,
                },
              },
            };
          }
          return group;
        })
        .sort((a, b) => {
          const dateA = a.lastMessage?.createdAt || a.createdAt;
          const dateB = b.lastMessage?.createdAt || b.createdAt;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

      set({ groups: updatedGroups });

      // Emit socket event for message delivery
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("group_message_delivered", {
          messageId: newMessage._id,
          groupId,
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "An error occurred");
    }
  },

  getGroupMessages: async (groupId: string) => {
    set({ isGroupMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ groupMessages: res.data as GroupMessage[] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      set({ isGroupMessagesLoading: false });
    }
  },

  setSelectedGroup: (selectedGroup: Group | null) => set({ selectedGroup }),

  createGroup: async (name: string, members: string[], image?: string) => {
    try {
      console.log("Creating group with image:", image); // Debug log
      const res = await axiosInstance.post("/groups", {
        name,
        members,
        image,
      });
      console.log("Group creation response:", res.data); // Debug log
      const newGroup = res.data as Group;
      set((state) => ({ groups: [newGroup, ...state.groups] }));
      toast.success("Group created successfully");
    } catch (error: any) {
      console.error("Error creating group:", error); // Debug log
      toast.error(error.response?.data?.message || "Failed to create group");
    }
  },

  subscribeToGroupMessages: (groupId: string) => {
    const socket = useAuthStore.getState().socket;

    if (!socket) {
      toast.error("Socket is not available.");
      return;
    }

    socket.on("newGroupMessage", (newMessage: GroupMessage) => {
      const { selectedGroup } = get();
      if (!selectedGroup || selectedGroup._id !== groupId) return;

      set((state) => ({
        groupMessages: [...state.groupMessages, newMessage],
        groups: state.groups.map((group) =>
          group._id === groupId
            ? {
                ...group,
                lastMessage: {
                  text: newMessage.text,
                  createdAt: newMessage.createdAt,
                  senderId: {
                    _id: newMessage.senderId._id,
                    fullName: newMessage.senderId.fullName,
                  },
                },
              }
            : group
        ),
      }));

      // Emit message delivered event
      socket.emit("group_message_delivered", {
        messageId: newMessage._id,
        groupId,
      });
    });

    // Listen for message status updates
    socket.on("group_message_status_update", ({ messageId, status }) => {
      set((state) => ({
        groupMessages: state.groupMessages.map((msg) =>
          msg._id === messageId ? { ...msg, status } : msg
        ),
      }));
    });
  },

  unsubscribeFromGroupMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newGroupMessage");
    socket.off("group_message_status_update");
  },

  updateGroup: async (
    groupId: string,
    payload: { name: string; image?: string }
  ) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}`, payload);
      const updatedGroup = res.data as Group;

      // Update the group in the groups list
      set((state) => ({
        groups: state.groups.map((group) =>
          group._id === groupId ? updatedGroup : group
        ),
        selectedGroup:
          state.selectedGroup?._id === groupId
            ? updatedGroup
            : state.selectedGroup,
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update group");
      throw error;
    }
  },

  deleteGroup: async (groupId: string) => {
    try {
      await axiosInstance.delete(`/groups/${groupId}`);

      // Remove the group from the groups list
      set((state) => ({
        groups: state.groups.filter((group) => group._id !== groupId),
        selectedGroup:
          state.selectedGroup?._id === groupId ? null : state.selectedGroup,
      }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete group");
      throw error;
    }
  },

  markGroupMessageAsRead: async (messageId: string) => {
    try {
      await axiosInstance.post(`/groups/messages/${messageId}/read`);
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("group_message_read", { messageId });
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to mark message as read"
      );
    }
  },
}));
