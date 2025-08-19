"use client";

import { FC, useState } from "react";
import Button from "./ui/Button";
import axios from "axios";
import { Check, X } from "lucide-react";

interface CreateGroupProps {
  friends: User[];
}

const CreateGroup: FC<CreateGroupProps> = ({ friends }) => {
  const [showSuccessState, setSuccessState] = useState<boolean>(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberError, setMemberError] = useState<string>("");
  const [nameError, setNameError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [groupName, setGroupName] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const toggleMember = (friendId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
    if (memberError) {
      setMemberError("");
    }
  };

  const createGroup = async () => {
    // Validation
    if (!groupName.trim()) {
      setNameError("Group name is required");
      return;
    }

    if (selectedMembers.length === 0) {
      setMemberError("Please select at least one member");
      return;
    }

    setNameError("");
    setMemberError("");
    setIsLoading(true);

    try {
      const groupData = {
        name: groupName.trim(),
        description: description.trim(),
        members: selectedMembers,
      };

      await axios.post("/api/groups/create", groupData);

      setSuccessState(true);
      setSelectedMembers([]);
      setGroupName("");
      setDescription("");

      setTimeout(() => setSuccessState(false), 3000);
    } catch (error) {
      if (error instanceof axios.AxiosError) {
        setNameError(error.response?.data || "Failed to create group");
      } else {
        setNameError("An error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGroup();
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Group Name
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="Enter group name"
          />
          {nameError && (
            <p className="mt-1 text-sm text-red-600">{nameError}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            rows={3}
            placeholder="Enter group description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium leading-6 text-gray-900 mb-3">
            Select Members ({selectedMembers.length} selected)
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
            {friends.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No friends available to add
              </p>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={friend.image}
                      alt={friend.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {friend.name}
                      </p>
                      <p className="text-xs text-gray-500">{friend.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleMember(friend.id)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      selectedMembers.includes(friend.id)
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 text-gray-400 hover:bg-gray-300"
                    }`}
                  >
                    {selectedMembers.includes(friend.id) ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
          {memberError && (
            <p className="mt-1 text-sm text-red-600">{memberError}</p>
          )}
          {selectedMembers.length > 0 && (
            <p className="mt-1 text-sm text-green-600">
              {selectedMembers.length} member
              {selectedMembers.length > 1 ? "s" : ""} selected
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={friends.length === 0}
            isLoading={isLoading}
          >
            Create Group
          </Button>
        </div>

        {showSuccessState && (
          <p className="mt-1 text-sm text-green-500">
            Group created successfully!
          </p>
        )}
      </form>
    </div>
  );
};

export default CreateGroup;
