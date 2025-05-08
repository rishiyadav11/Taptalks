import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useGroupStore } from "../store/useGroupStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Plus, MessageSquare } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";

// Import types from stores


const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { getGroups, groups, selectedGroup, setSelectedGroup } = useGroupStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  // Sort users by last message time
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const dateA = a.lastMessage?.createdAt || a.createdAt;
    const dateB = b.lastMessage?.createdAt || b.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  // Sort groups by last message time
  const sortedGroups = [...groups].sort((a, b) => {
    const dateA = a.lastMessage?.createdAt || a.createdAt;
    const dateB = b.lastMessage?.createdAt || b.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  if (isUsersLoading) return <SidebarSkeleton />;

  // console.log(groups);
  
  return (
    <aside className="h-full w-16 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-3 lg:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5 lg:size-6" />
            <span className="font-medium hidden lg:block">Contacts</span>
          </div>
          <button
            onClick={() => setIsCreateGroupModalOpen(true)}
            className="btn btn-circle btn-sm"
            title="Create Group"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-base-300">
        <button
          className={`flex-1 p-2 lg:p-3 text-sm font-medium flex items-center justify-center gap-2 ${
            activeTab === 'users' ? 'border-b-2 border-primary' : 'text-base-content/60'
          }`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="size-4 lg:size-5" />
          <span className="hidden lg:inline">Users</span>
        </button>
        <button
          className={`flex-1 p-2 lg:p-3 text-sm font-medium flex items-center justify-center gap-2 ${
            activeTab === 'groups' ? 'border-b-2 border-primary' : 'text-base-content/60'
          }`}
          onClick={() => setActiveTab('groups')}
        >
          <MessageSquare className="size-4 lg:size-5" />
          <span className="hidden lg:inline">Groups</span>
        </button>
      </div>

      <div className="overflow-y-auto w-full py-2 lg:py-3">
        {activeTab === 'users' ? (
          <>
            {sortedUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => {
                  setSelectedUser(user);
                  setSelectedGroup(null);
                }}
                className={`
                  w-full p-2 lg:p-3 flex items-center gap-2 lg:gap-3
                  hover:bg-base-300 transition-colors
                  ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                `}
              >
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="size-10 lg:size-12 object-cover rounded-full"
                  />
                  {onlineUsers.includes(user._id) && (
                    <span
                      className="absolute bottom-0 right-0 size-2 lg:size-3 bg-green-500 
                      rounded-full ring-2 ring-zinc-900"
                    />
                  )}
                </div>

                <div className="hidden lg:block text-left min-w-0 flex-1">
                  <div className="font-medium truncate">{user.fullName}</div>
                  <div className="text-sm text-zinc-400 truncate">
                    {user.lastMessage ? (
                      <>
                        <span className="font-medium">{user.lastMessage.senderId.fullName}: </span>
                        {user.lastMessage.text || "Sent an image"}
                      </>
                    ) : (
                      onlineUsers.includes(user._id) ? "Online" : "Offline"
                    )}
                  </div>
                </div>
              </button>
            ))}

            {sortedUsers.length === 0 && (
              <div className="text-center text-zinc-500 py-4">No online users</div>
            )}
          </>
        ) : (
          <>
            {sortedGroups.map((group) => (
              <button
                key={group._id}
                onClick={() => {
                  setSelectedGroup(group);
                  setSelectedUser(null);
                }}
                className={`
                  w-full p-2 lg:p-3 flex items-center gap-2 lg:gap-3
                  hover:bg-base-300 transition-colors
                  ${selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                `}
              >
                <div className="relative mx-auto lg:mx-0">
                  {group.image && group.image !== "https://img.freepik.com/free-vector/group-young-people-posing-photo_52683-18823.jpg?ga=GA1.1.1092467876.1743869642&semt=ais_hybrid&w=740" ? (
                    <img
                      src={group.image}
                      alt={group.name}
                      className="size-10 lg:size-12 object-cover rounded-full"
                    />
                  ) : (
                    <div className="size-10 lg:size-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="size-5 lg:size-6 text-primary" />
                    </div>
                  )}
                </div>

                <div className="hidden lg:block text-left min-w-0 flex-1">
                  <div className="font-medium truncate">{group.name}</div>
                  <div className="text-sm text-zinc-400 truncate">
                    {group.lastMessage ? (
                      <>
                        <span className="font-medium">{group.lastMessage.senderId.fullName}: </span>
                        {group.lastMessage.text || "Sent an image"}
                      </>
                    ) : (
                      `${group.members.length} members`
                    )}
                  </div>
                </div>
              </button>
            ))}

            {sortedGroups.length === 0 && (
              <div className="text-center text-zinc-500 py-4">No groups</div>
            )}
          </>
        )}
      </div>

      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
      />
    </aside>
  );
};

export default Sidebar;