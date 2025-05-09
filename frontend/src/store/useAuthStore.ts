import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";

const BASE_URL =
  import.meta.env.VITE_API_URL;

interface AuthUser {
  _id?: string;
  email: string;
  fullName: string;
  createdAt?: string; // Add this field
  profilePic?: string; // Make sure to include this property
  // Add other fields as necessary
}

interface AxiosErrorResponse {
  response?: {
    data: {
      message: string;
    };
  };
}

// Extending Error to include AxiosErrorResponse
interface AxiosError extends Error, AxiosErrorResponse {}

// Define the store
interface AuthStore {
  authUser: AuthUser | null;
  isSigningUp: boolean;
  isLoggingIn: boolean;
  isUpdatingProfile: boolean;
  isCheckingAuth: boolean;
  onlineUsers: string[];
  socket: Socket | null;

  checkAuth: () => Promise<void>;
  signup: (data: {
    fullName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  login: (data: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: {
    name?: string;
    email?: string;
    profilePic?: string;
  }) => Promise<void>;
  connectSocket: () => void;
  disconnectSocket: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      // Explicitly cast res.data as AuthUser
      if (
        res.data &&
        typeof res.data === "object" &&
        (res.data as AuthUser)._id
      ) {
        set({ authUser: res.data as AuthUser });
        get().connectSocket();
      } else {
        set({ authUser: null });
      }
    } catch (error: unknown) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data as AuthUser });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error: unknown) {
      if ((error as AxiosError).response) {
        const err = error as AxiosError;
        toast.error(err.response?.data.message || "An unknown error occurred");
      } else {
        toast.error("An unknown error occurred");
      }
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data as AuthUser });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error: unknown) {
      if ((error as AxiosError).response) {
        const err = error as AxiosError;
        toast.error(err.response?.data.message || "An unknown error occurred");
      } else {
        toast.error("An unknown error occurred");
      }
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error: unknown) {
      if ((error as AxiosError).response) {
        const err = error as AxiosError;
        toast.error(err.response?.data.message || "An unknown error occurred");
      } else {
        toast.error("An unknown error occurred");
      }
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data as AuthUser });
      toast.success("Profile updated successfully");
    } catch (error: unknown) {
      console.log("error in update profile:", error);
      if ((error as AxiosError).response) {
        const err = error as AxiosError;
        toast.error(err.response?.data.message || "An unknown error occurred");
      } else {
        toast.error("An unknown error occurred");
      }
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    const socket = io(BASE_URL, {
      query: {
        userId: authUser._id,
      },
    });
    socket.connect();

    set({ socket: socket });

    socket.on("getOnlineUsers", (userIds: string[]) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket?.disconnect();
  },
}));
