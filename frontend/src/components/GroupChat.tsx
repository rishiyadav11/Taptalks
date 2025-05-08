import  { useEffect, useState } from 'react';
import { useGroupStore } from '../store/useGroupStore';

const GroupChat = () => {
  const { selectedGroup, groupMessages, getGroupMessages, sendGroupMessage } = useGroupStore();
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (selectedGroup) {
      getGroupMessages(selectedGroup._id);
    }
  }, [selectedGroup, getGroupMessages]);

  const handleSendMessage = () => {
    if (selectedGroup && newMessage.trim()) {
      sendGroupMessage(selectedGroup._id, { text: newMessage });
      setNewMessage('');
    }
  };

  if (!selectedGroup) {
    return <div>No group selected</div>;
  }

  return (
    <div>
      <h2>{selectedGroup.name}</h2> 
      <ul>
        {groupMessages.map((message) => (
          <li key={message._id}>
            <strong>{message.senderId.fullName}</strong>: {message.text}
          </li>
        ))}
      </ul>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
};

export default GroupChat; 