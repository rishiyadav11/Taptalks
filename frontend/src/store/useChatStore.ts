import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

// Define User and Message types
type User = {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
};

type Message = {
  _id: string;
  senderId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
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
      set({ users: res.data as User[] }); // Type casting to User[]
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
      set({ messages: res.data as Message[] }); // Type casting to Message[]
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
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data as Message] }); // Type casting to Message
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

    socket.on("newMessage", (newMessage: Message) => { // Type casting to Message
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;

    if (!socket) return;

    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser: User | null) => set({ selectedUser }), // Handle selectedUser as null or User
}));
