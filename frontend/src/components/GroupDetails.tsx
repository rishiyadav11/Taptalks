import { useState, useEffect } from "react";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { X, Edit2, Save, Trash2, UserPlus, Search, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

interface Member {
  _id: string;
  fullName: string;
  email: string;
  profilePic?: string;
}

interface GroupData {
  _id: string;
  name: string;
  image?: string;
  members: Member[];
  admin: string;
}

interface GroupDetailsProps {
  onClose: () => void;
}

// Helper to extract string from ObjectId or string
function getId(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if ('$oid' in val) return val.$oid;
    if ('_id' in val) return getId(val._id);
    // Try to extract from Mongoose ObjectId
    if (val.toHexString) return val.toHexString();
    if (val.toString && typeof val.toString === 'function') {
      const str = val.toString();
      // If toString returns [object Object], ignore
      if (!str.startsWith('[object')) return str;
    }
  }
  return '';
}

export const GroupDetails = ({ onClose }: GroupDetailsProps) => {
  const { selectedGroup, updateGroup, deleteGroup } = useGroupStore();
  const { authUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(selectedGroup?.name || "");
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(selectedGroup?.image || "");
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedGroup) return;

      try {
        setIsLoading(true);
        const response = await axiosInstance.get<GroupData>(`/groups/${selectedGroup._id}/details`);
        // Ensure unique members by filtering duplicates
        const uniqueMembers = response.data.members.filter(
          (member, index, self) => 
            index === self.findIndex((m) => m._id === member._id)
        );
        setMembers(uniqueMembers);
      } catch (error) {
        console.error("Error fetching members:", error);
        toast.error("Failed to fetch group members");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [selectedGroup]);

  if (!selectedGroup) return null;

  // Use the helper for admin check
  const adminId = getId(selectedGroup.admin);
  const userId = getId(authUser?._id);
  console.log('adminId:', adminId, 'userId:', userId);
  const isAdmin = adminId === userId;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      setGroupImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
      if (groupImage) {
        // Convert File to base64
        const reader = new FileReader();
        reader.readAsDataURL(groupImage);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const payload = {
            name: groupName,
            image: base64data
          };
          console.log("Sending payload:", { name: payload.name, hasImage: !!payload.image });
          await updateGroup(selectedGroup._id, payload);
          setIsEditing(false);
          toast.success("Group updated successfully");
        };
      } else {
        const payload = {
          name: groupName
        };
        console.log("Sending payload:", payload);
        await updateGroup(selectedGroup._id, payload);
        setIsEditing(false);
        toast.success("Group updated successfully");
      }
    } catch (error: any) {
      console.error("Error updating group:", error);
      toast.error(error.response?.data?.message || "Failed to update group");
    }
  };
  

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;

    try {
      await deleteGroup(selectedGroup._id);
      onClose();
      toast.success("Group deleted successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete group");
    }
  };

  const handleSearchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await axiosInstance.get<Member[]>(`/auth/search?q=${encodeURIComponent(query)}`);
      // Filter out users who are already members
      const filteredResults = response.data.filter(
        (user) => !members.some(member => member._id === user._id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await axiosInstance.post(`/groups/${selectedGroup._id}/add-member`, { memberId: userId });
      // Fetch updated group details
      const response = await axiosInstance.get<GroupData>(`/groups/${selectedGroup._id}/details`);
      setMembers(response.data.members);
      setShowAddMemberModal(false);
      setSearchQuery("");
      setSearchResults([]);
      toast.success("Member added successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;

    try {
      await axiosInstance.post(`/groups/${selectedGroup._id}/remove-member`, { memberId });
      setMembers(members.filter(member => member._id !== memberId));
      toast.success("Member removed successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;

    try {
      await axiosInstance.post(`/groups/${selectedGroup._id}/leave`);
      // Remove the group from the groups list in the store
      const { groups } = useGroupStore.getState();
      useGroupStore.setState({
        groups: groups.filter(group => group._id !== selectedGroup._id),
        selectedGroup: null
      });
      onClose();
      toast.success("Left group successfully");
    } catch (error: any) {
      console.error("Error leaving group:", error);
      toast.error(error.response?.data?.message || "Failed to leave group");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg w-full max-w-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Group Details</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Group Image */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <img
                src={imagePreview || "/avatar.png"}
                alt={groupName}
                className="w-32 h-32 rounded-full object-cover"
              />
              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-primary text-primary-content p-2 rounded-full cursor-pointer">
                  <Edit2 size={16} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Group Name */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Group Name</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Enter group name"
              />
            ) : (
              <p className="text-lg font-medium">{groupName}</p>
            )}
          </div>

          {/* Members List */}
          <div className="form-control">
            <div className="flex items-center justify-between mb-2">
              <label className="label">
                <span className="label-text">Members ({members.length})</span>
              </label>
              {isAdmin && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddMemberModal(true)}
                >
                  <UserPlus size={16} className="mr-1" />
                  Add Member
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="loading loading-spinner loading-md"></div>
                </div>
              ) : members.length === 0 ? (
                <p className="text-center py-4 text-base-content/70">No members in this group</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={member.profilePic || "/avatar.png"}
                        alt={member.fullName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium flex items-center gap-1">
                          {member._id === selectedGroup.admin && (
                            <span className="text-yellow-500" title="Group Admin">👑</span>
                          )}
                          {member.fullName}
                        </p>
                        <p className="text-sm text-base-content/70">{member.email}</p>
                      </div>
                    </div>
                    {isAdmin && member._id !== selectedGroup.admin ? (
                      <button
                        className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                        onClick={() => handleRemoveMember(member._id)}
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : member._id === userId && !isAdmin ? (
                      <button
                        className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                        onClick={handleLeaveGroup}
                        title="Leave group"
                      >
                        <LogOut size={16} />
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Admin Actions */}
          {isAdmin ? (
            <div className="flex justify-end gap-2 mt-4">
              {isEditing ? (
                <>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setIsEditing(false);
                      setGroupName(selectedGroup.name);
                      setImagePreview(selectedGroup.image || "");
                    }}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleSave}>
                    <Save size={16} className="mr-2" />
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-error"
                    onClick={handleDeleteGroup}
                  >
                    Delete Group
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 size={16} className="mr-2" />
                    Edit Group
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex justify-end mt-4">
              <button
                className="btn btn-error"
                onClick={handleLeaveGroup}
              >
                <LogOut size={16} className="mr-2" />
                Leave Group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-base-100 rounded-lg w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Member</h3>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="btn btn-ghost btn-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                  placeholder="Search users by name or email..."
                  className="input input-bordered w-full pr-10"
                />
                <Search size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/50" />
              </div>

              {isSearching ? (
                <div className="flex justify-center py-4">
                  <div className="loading loading-spinner loading-md"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-sm text-base-content/70">{user.email}</p>
                        </div>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAddMember(user._id)}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <p className="text-center py-4 text-base-content/70">No users found</p>
              ) : (
                <p className="text-center py-4 text-base-content/70">
                  Start typing to search for users
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetails; 