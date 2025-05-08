import { useGroupStore } from "../store/useGroupStore";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { format } from "date-fns";
import { Loader2, Settings } from "lucide-react";
import MessageInput from "./MessageInput";
import { X } from "lucide-react";
import GroupDetails from "./GroupDetails";
import MessageReactions from "./MessageReactions";

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
  reactions?: { emoji: string; user: string; }[];
  status: "sent" | "delivered" | "read";
};

export const GroupChatContainer = () => {
  const {
    groupMessages,
    getGroupMessages,
    isGroupMessagesLoading,
    selectedGroup,
    setSelectedGroup,
    subscribeToGroupMessages,
    unsubscribeFromGroupMessages,
    markGroupMessageAsRead,
  } = useGroupStore();
  const { authUser, socket } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    if (selectedGroup && selectedGroup._id) {
      getGroupMessages(selectedGroup._id);
      subscribeToGroupMessages(selectedGroup._id);
      
      // Join the group room
      if (socket) {
        socket.emit("join_group", { groupId: selectedGroup._id });
      }
    }

    return () => {
      unsubscribeFromGroupMessages();
      // Leave the group room
      if (socket && selectedGroup) {
        socket.emit("leave_group", { groupId: selectedGroup._id });
      }
    };
  }, [selectedGroup, getGroupMessages, subscribeToGroupMessages, unsubscribeFromGroupMessages, socket]);

  // Mark messages as read when they are viewed
  useEffect(() => {
    if (groupMessages.length > 0 && selectedGroup) {
      const unreadMessages = groupMessages.filter(
        (msg) => msg.senderId._id !== authUser?._id && msg.status !== "read"
      );
      unreadMessages.forEach((msg) => markGroupMessageAsRead(msg._id));
    }
  }, [groupMessages, selectedGroup, authUser?._id, markGroupMessageAsRead]);

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
    if (groupMessages.length > 0 && (isNearBottom || groupMessages[groupMessages.length - 1].senderId._id === authUser?._id)) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [groupMessages, isNearBottom, authUser?._id]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!isGroupMessagesLoading && groupMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [isGroupMessagesLoading]);

  if (isGroupMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto bg-base-100">
        <div className="p-2.5 border-b border-base-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="avatar">
                <div className="size-10 rounded-full relative">
                  <img
                    src={selectedGroup?.image || "/avatar.png"}
                    alt={selectedGroup?.name}
                  />
                </div>
              </div>
              <div>
                <h3 className="font-medium">{selectedGroup?.name}</h3>
                <p className="text-sm text-base-content/70">
                  {selectedGroup?.members.length} members
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGroupDetails(true)}
                className="btn btn-ghost btn-sm"
              >
                <Settings size={20} />
              </button>
              <button onClick={() => setSelectedGroup(null)} className="btn btn-ghost btn-sm">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
        <MessageInput isGroup={true} />
      </div>
    );
  }

  if (!authUser || !selectedGroup) return null;

  return (
    <div className="flex-1 flex flex-col bg-base-100">
      {/* Group Header */}
      <div className="p-2.5 border-b border-base-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="avatar">
              <div className="size-10 rounded-full relative">
                <img
                  src={selectedGroup.image || "/avatar.png"}
                  alt={selectedGroup.name}
                />
              </div>
            </div>
            <div>
              <h3 className="font-medium">{selectedGroup.name}</h3>
              <p className="text-sm text-base-content/70">
                {selectedGroup.members.length} members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGroupDetails(true)}
              className="btn btn-ghost btn-sm"
            >
              <Settings size={20} />
            </button>
            <button onClick={() => setSelectedGroup(null)} className="btn btn-ghost btn-sm">
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {groupMessages.map((message: GroupMessage) => (
          <div
            key={message._id}
            className={`chat ${message.senderId._id === authUser._id ? "chat-end" : "chat-start"} group`}
            onMouseEnter={() => setHoveredMessageId(message._id)}
            onMouseLeave={() => setHoveredMessageId(null)}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={message.senderId.profilePic || "/avatar.png"}
                  alt={message.senderId.fullName}
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              {message.senderId._id !== authUser._id && (
                <span className="text-sm font-medium">{message.senderId.fullName}</span>
              )}
              <time className="text-xs opacity-50 ml-1">
                {format(new Date(message.createdAt), "h:mm a")}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
              <div className="flex items-center gap-2 mt-2">
                <MessageReactions
                  messageId={message._id}
                  reactions={message.reactions || []}
                  refreshMessages={() => {
                    if (selectedGroup) getGroupMessages(selectedGroup._id);
                  }}
                  show={hoveredMessageId === message._id}
                />
                {message.senderId._id === authUser._id && (
                  <span className="text-xs opacity-50">
                    {message.status === "sent" && "✔"}
                    {message.status === "delivered" && "✔✔"}
                    {message.status === "read" && (
                      <span className="text-blue-500">✔✔</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-2.5 border-t border-base-300">
        <MessageInput isGroup={true} />
      </div>

      {/* Group Details Modal */}
      {showGroupDetails && (
        <GroupDetails onClose={() => setShowGroupDetails(false)} />
      )}
    </div>
  );
};

export default GroupChatContainer; 