import  { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io();

const ChatBox = ({ selectedChat, isGroup }: { selectedChat: any; isGroup: boolean }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<number | null>(null);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      if (isGroup) {
        socket.emit("group_typing", { groupId: selectedChat._id });
      } else {
        socket.emit("typing", { toUserId: selectedChat._id });
      }
    }

    if (typingTimeout) clearTimeout(typingTimeout);

    const timeout = setTimeout(() => {
      setIsTyping(false);
      if (isGroup) {
        socket.emit("group_stop_typing", { groupId: selectedChat._id });
      } else {
        socket.emit("stop_typing", { toUserId: selectedChat._id });
      }
    }, 1000) as unknown as number; // Explicit cast here
    setTypingTimeout(timeout);
  };

  useEffect(() => {
    if (!socket) return;

    const handleTypingEvent = ({ fromUserId }: { fromUserId: string }) => {
      console.log(`${fromUserId} is typing`);
    };

    const handleStopTypingEvent = ({ fromUserId }: { fromUserId: string }) => {
      console.log(`${fromUserId} stopped typing`);
    };

    socket.on("typing", handleTypingEvent);
    socket.on("stop_typing", handleStopTypingEvent);

    return () => {
      socket.off("typing", handleTypingEvent);
      socket.off("stop_typing", handleStopTypingEvent);
    };
  }, [socket]);

  return (
    <div>
      <input
        type="text"
        placeholder="Type a message..."
        value={newMessage}
        onChange={(e) => {
          setNewMessage(e.target.value);
          handleTyping();
        }}
      />
      {isTyping && <div>You are typing...</div>}
    </div>
  );
};

export default ChatBox;