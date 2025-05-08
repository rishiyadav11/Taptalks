import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import MessageReactions from "./MessageReactions";

// Make sure the Message interface includes the required properties
interface Message {
  _id: string;
  senderId: string;
  createdAt: string; // Ensure this is present
  text: string;      // Ensure this is present
  image?: string;
  reactions?: { emoji: string; user: string; }[];
  status: "sent" | "delivered" | "read";
}

export type User = {
  _id: string;
  name: string;
  email: string;
  profilePic: string; // 
};

const ChatContainer: React.FC = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    markMessageAsRead,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    if (selectedUser && selectedUser._id) {
      getMessages(selectedUser._id);
      subscribeToMessages();
    }
  
    return () => unsubscribeFromMessages();
  }, [selectedUser, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  // Mark messages as read when they are viewed
  useEffect(() => {
    if (messages.length > 0 && selectedUser) {
      const unreadMessages = messages.filter(
        (msg) => msg.senderId === selectedUser._id && msg.status !== "read"
      );
      unreadMessages.forEach((msg) => markMessageAsRead(msg._id));
    }
  }, [messages, selectedUser, markMessageAsRead]);

  // Function to check if we're near the bottom
  const isNearBottomOfChat = () => {
    if (!chatContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const threshold = 100; // pixels from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  // Handle scroll events
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      setIsNearBottom(isNearBottomOfChat());
    };

    chatContainer.addEventListener('scroll', handleScroll);
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && (isNearBottom || messages[messages.length - 1].senderId === authUser?._id)) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isNearBottom, authUser?._id]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!isMessagesLoading && messages.length > 0) {
      messageEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [isMessagesLoading]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  if (!authUser) return null;

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message: Message) => {
          const safeMessage = { ...message, reactions: message.reactions || [] };
          return (
            <div
              key={safeMessage._id}
              className={`chat ${safeMessage.senderId === authUser._id ? "chat-end" : "chat-start"} group`}
              onMouseEnter={() => setHoveredMessageId(safeMessage._id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      safeMessage.senderId === authUser._id
                        ? authUser.profilePic || "/avatar.png"
                        : selectedUser?.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                  />
                </div>
              </div>
              <div className="chat-header mb-1">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(safeMessage.createdAt)}
                </time>
              </div>
              <div className="chat-bubble flex flex-col">
                {safeMessage.image && (
                  <img
                    src={safeMessage.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}
                {safeMessage.text && <p>{safeMessage.text}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <MessageReactions
                    messageId={safeMessage._id}
                    reactions={safeMessage.reactions}
                    refreshMessages={() => {
                      if (selectedUser) getMessages(selectedUser._id);
                    }}
                    show={hoveredMessageId === safeMessage._id}
                  />
                  {safeMessage.senderId === authUser._id && (
                    <span className="text-xs opacity-50">
                      {safeMessage.status === "sent" && "✔"}
                      {safeMessage.status === "delivered" && "✔✔"}
                      {safeMessage.status === "read" && (
                        <span className="text-blue-500">✔✔</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
