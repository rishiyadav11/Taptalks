import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { Image, Send, X } from "lucide-react";
import toast from "react-hot-toast";

import type { ChangeEvent, FormEvent } from "react";

// Define the message type
interface Message {
  text: string;
  image?: string;
}

interface MessageInputProps {
  isGroup?: boolean;
}

const MessageInput = ({ isGroup = false }: MessageInputProps) => {
  const [message, setMessage] = useState<Message>({ text: "" });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useChatStore();
  const { sendGroupMessage, selectedGroup } = useGroupStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.text.trim() && !message.image) {
      toast.error("Message must contain either text or an image");
      return;
    }

    try {
      if (isGroup && selectedGroup) {
        await sendGroupMessage(selectedGroup._id, message);
      } else {
        await sendMessage(message);
      }
      setMessage({ text: "" });
      setImagePreview(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setMessage((prev) => ({ ...prev, image: base64String }));
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setMessage((prev) => ({ ...prev, image: undefined }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-4 border-t border-base-300">
      {imagePreview && (
        <div className="relative mb-4">
          <img
            src={imagePreview}
            alt="Preview"
            className="max-h-32 rounded-lg"
          />
          <button
            onClick={removeImage}
            className="absolute top-2 right-2 p-1 bg-base-300 rounded-full hover:bg-base-400"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          value={message.text}
          onChange={(e) => setMessage((prev) => ({ ...prev, text: e.target.value }))}
          className="input input-bordered flex-1"
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          ref={fileInputRef}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-circle"
        >
          <Image className="size-5" />
        </button>
        <button type="submit" className="btn btn-circle btn-primary">
          <Send className="size-5" />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
