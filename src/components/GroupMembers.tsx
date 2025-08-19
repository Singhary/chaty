"use client";

import { FC, useState } from "react";
import Button from "./ui/Button";
import axios from "axios";
import { Crown, UserMinus, Users } from "lucide-react";
import Image from "next/image";
import { toast } from "react-hot-toast";

interface GroupMembersProps {
  group: Group;
  members: User[];
  sessionId: string;
  isCurrentUserAdmin: boolean;
}

const GroupMembers: FC<GroupMembersProps> = ({
  group,
  members,
  sessionId,
  isCurrentUserAdmin,
}) => {
  const [loading, setLoading] = useState<string | null>(null);

  const removeMember = async (userId: string) => {
    if (!isCurrentUserAdmin) {
      toast.error("Only admins can remove members");
      return;
    }

    setLoading(`remove-${userId}`);
    try {
      await axios.post("/api/groups/remove-member", {
        groupId: group.id,
        userId,
      });
      toast.success("Member removed successfully");
    } catch (error) {
      if (error instanceof axios.AxiosError) {
        toast.error(error.response?.data || "Failed to remove member");
      } else {
        toast.error("An error occurred");
      }
    } finally {
      setLoading(null);
    }
  };

  const makeAdmin = async (userId: string) => {
    if (!isCurrentUserAdmin) {
      toast.error("Only admins can promote members");
      return;
    }

    setLoading(`admin-${userId}`);
    try {
      await axios.post("/api/groups/make-admin", {
        groupId: group.id,
        userId,
      });
      toast.success("Member promoted to admin");
    } catch (error) {
      if (error instanceof axios.AxiosError) {
        toast.error(error.response?.data || "Failed to promote member");
      } else {
        toast.error("An error occurred");
      }
    } finally {
      setLoading(null);
    }
  };

  const isAdmin = (userId: string) => group.admins.includes(userId);
  const isCreator = (userId: string) => group.createdBy === userId;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Users className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold">
          Group Members ({members.length})
        </h3>
      </div>

      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10">
                <Image
                  fill
                  src={member.image}
                  alt={member.name}
                  className="rounded-full"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900">
                    {member.name}
                  </p>
                  {isCreator(member.id) && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center space-x-1">
                      <Crown className="w-3 h-3" />
                      <span>Creator</span>
                    </span>
                  )}
                  {isAdmin(member.id) && !isCreator(member.id) && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center space-x-1">
                      <Crown className="w-3 h-3" />
                      <span>Admin</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{member.email}</p>
              </div>
            </div>

            {/* Admin Controls */}
            {isCurrentUserAdmin && member.id !== sessionId && (
              <div className="flex items-center space-x-2">
                {/* Make Admin Button */}
                {!isAdmin(member.id) && (
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => makeAdmin(member.id)}
                    isLoading={loading === `admin-${member.id}`}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Crown className="w-4 h-4" />
                  </Button>
                )}

                {/* Remove Member Button */}
                {!isCreator(member.id) && (
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => removeMember(member.id)}
                    isLoading={loading === `remove-${member.id}`}
                    className="text-red-600 hover:text-red-700"
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Self indicator */}
            {member.id === sessionId && (
              <span className="text-xs text-gray-500 font-medium">You</span>
            )}
          </div>
        ))}
      </div>

      {!isCurrentUserAdmin && (
        <p className="text-sm text-gray-500 text-center">
          Only admins can manage group members
        </p>
      )}
    </div>
  );
};

export default GroupMembers;
