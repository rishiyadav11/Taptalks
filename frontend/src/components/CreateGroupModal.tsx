import React, { useState, useRef } from 'react';
import { useGroupStore } from '../store/useGroupStore';
import { useChatStore } from '../store/useChatStore';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateGroupModal = ({ isOpen, onClose }: CreateGroupModalProps) => {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createGroup } = useGroupStore();
  const { users } = useChatStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim() && selectedMembers.length > 0) {
      try {
        setIsUploading(true);
        // Convert File to base64 string if image is selected
        let imageString: string | undefined;
        if (groupImage) {
          console.log('Converting image to base64...'); // Debug log
          const reader = new FileReader();
          imageString = await new Promise((resolve) => {
            reader.onloadend = () => {
              const base64String = reader.result as string;
              console.log('Base64 string length:', base64String.length); // Debug log
              resolve(base64String);
            };
            reader.readAsDataURL(groupImage);
          });
        }
        
        console.log('Creating group with data:', { name: groupName, members: selectedMembers, hasImage: !!imageString }); // Debug log
        await createGroup(groupName, selectedMembers, imageString);
        setGroupName('');
        setSelectedMembers([]);
        setGroupImage(null);
        setImagePreview(null);
        onClose();
      } catch (error) {
        console.error('Error creating group:', error);
        toast.error('Failed to create group');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setGroupImage(file);
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const removeImage = () => {
    setGroupImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create New Group</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="input input-bordered w-full"
              placeholder="Enter group name"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Group Image</label>
            <div className="flex items-center gap-4">
              <div className="relative size-20">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Group"
                      className="size-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error"
                    >
                      <X className="size-3" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="size-20 border-2 border-dashed border-base-300 rounded-lg flex items-center justify-center hover:border-primary transition-colors"
                  >
                    <ImagePlus className="size-8 text-base-300" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              {!imagePreview && (
                <div className="text-sm text-base-content/60">
                  Click to upload a group image
                  <br />
                  <span className="text-xs">Max size: 5MB</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Members</label>
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              {users.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center gap-2 p-2 hover:bg-base-200 cursor-pointer"
                  onClick={() => toggleMember(user._id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(user._id)}
                    onChange={() => {}}
                    className="checkbox checkbox-sm"
                  />
                  <img
                    src={user.profilePic || "/avatar.png"}
                    alt={user.fullName}
                    className="size-8 rounded-full"
                  />
                  <span>{user.fullName}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!groupName.trim() || selectedMembers.length === 0 || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal; 