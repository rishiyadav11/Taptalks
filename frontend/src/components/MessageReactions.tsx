import { useState } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { Plus } from "lucide-react";

interface Reaction {
  emoji: string;
  user: string;
}
interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  refreshMessages: () => void;
  show: boolean;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({ messageId, reactions, refreshMessages, show }) => {
  const { authUser } = useAuthStore();
  const [showPicker, setShowPicker] = useState(false);

  // If authUser is not loaded, don't render reactions
  if (!authUser) return null;

  // Group reactions by emoji
  const grouped = reactions.reduce((acc: Record<string, string[]>, r) => {
    acc[r.emoji] = acc[r.emoji] || [];
    acc[r.emoji].push(r.user);
    return acc;
  }, {});

  const userId = authUser._id || "";
  const userReacted = (emoji: string) => grouped[emoji]?.includes(userId);

  const handleReact = async (emoji: string) => {
    await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
    setShowPicker(false);
    refreshMessages();
  };

  const handleRemoveReaction = async (emoji: string) => {
    if (userReacted(emoji)) {
      await axiosInstance.delete(`/messages/${messageId}/react`);
      refreshMessages();
    }
  };

  return (
    <div className="flex gap-1.5 mt-1 items-center relative">
      {Object.entries(grouped).map(([emoji, users]) => (
        <button
          key={emoji}
          className={`px-2 py-1 rounded-full flex items-center gap-1 transition-all duration-200 hover:scale-105 ${
            userReacted(emoji) 
              ? "bg-primary/10 text-primary hover:bg-primary/20" 
              : "bg-base-200 hover:bg-base-300"
          }`}
          onClick={() => userReacted(emoji) ? handleRemoveReaction(emoji) : handleReact(emoji)}
        >
          <span className="text-base">{emoji}</span>
          <span className="text-xs font-medium">{users.length}</span>
        </button>
      ))}
      <button
        className={`px-2 py-1 rounded-full bg-base-200 hover:bg-base-300 transition-all duration-200 hover:scale-105 flex items-center justify-center ${
          show ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowPicker((v) => !v)}
      >
        <Plus className="size-4" />
      </button>
      {showPicker && (
        <div className="absolute bottom-full right-0 mb-2 z-50 shadow-lg rounded-lg overflow-hidden">
          <EmojiPicker
            onEmojiClick={(emojiData) => handleReact(emojiData.emoji)}
            theme={Theme.LIGHT}
            width={300}
            height={350}
          />
        </div>
      )}
    </div>
  );
};

export default MessageReactions; 