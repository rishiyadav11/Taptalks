import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

// Define User and Message types
type User = {
  _id: string;
  fullName: string;
  email: string;
  profilePic?: string;
  lastMessage?: {
    text: string;
    createdAt: string;
    senderId: {
      _id: string;
      fullName: string;
    };
  };
  createdAt: string;
};

type Message = {
  _id: string;
  senderId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  image?: string;
  reactions?: { emoji: string; user: string }[];
  status: "sent" | "delivered" | "read";
};

interface ChatStore {
  messages: Message[];
  users: User[];
  selectedUser: User | null;
  isUsersLoading: boolean;
  isMessagesLoading: boolean;

  getUsers: () => Promise<void>;
  getMessages: (userId: string) => Promise<void>;
  sendMessage: (messageData: { text: string; image?: string }) => Promise<void>;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
  setSelectedUser: (selectedUser: User | null) => void;
  markMessageAsRead: (messageId: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data as User[] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId: string) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data as Message[] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "An error occurred");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData: { text: string; image?: string }) => {
    const { selectedUser, messages } = get();
    if (!selectedUser) return;

    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      const responseData = res.data as Omit<Message, "status">;
      const newMessage: Message = {
        ...responseData,
        status: "sent",
      };
      set({ messages: [...messages, newMessage] });

      // Emit socket event for message delivery
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("message_delivered", { messageId: newMessage._id });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "An error occurred");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    if (!socket) {
      toast.error("Socket is not available.");
      return;
    }

    socket.on("newMessage", (newMessage: Message) => {
      const isMessageSentFromSelectedUser =
        newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });

      // Emit message delivered event
      socket.emit("message_delivered", { messageId: newMessage._id });
    });

    // Listen for message status updates
    socket.on("message_status_update", ({ messageId, status }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, status } : msg
        ),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("message_status_update");
  },

  setSelectedUser: (selectedUser: User | null) => set({ selectedUser }),

  markMessageAsRead: async (messageId: string) => {
    try {
      await axiosInstance.post(`/messages/${messageId}/read`);
      const socket = useAuthStore.getState().socket;
      if (socket) {
        socket.emit("message_read", { messageId });
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to mark message as read"
      );
    }
  },
}));
