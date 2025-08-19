"use client";
import { pusherClient } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { FC, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Users } from "lucide-react";

interface SidebarGroupListProps {
  groups: Group[];
  sessionId: string;
}

interface ExtendedGroupMessage extends GroupMessage {
  senderImg: string;
  senderName: string;
  groupName: string;
}

const SidebarGroupList: FC<SidebarGroupListProps> = ({ groups, sessionId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [unseenMessages, setUnseenMessages] = useState<GroupMessage[]>([]);
  const [activeGroups, setActiveGroups] = useState<Group[]>(groups);

  useEffect(() => {
    pusherClient.subscribe(toPusherKey(`user:${sessionId}:groups`));

    const newGroupHandler = (data: { group: Group; createdBy: User }) => {
      console.log("new group", data.group);
      setActiveGroups((prev) => [...prev, data.group]);
    };

    const groupMessageHandler = (message: ExtendedGroupMessage) => {
      const shouldNotify = pathname !== `/dashboard/group/${message.groupId}`;

      if (!shouldNotify) {
        return;
      }

      toast.custom((t) => (
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5">
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="relative h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {message.groupName}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  <span className="font-medium">{message.senderName}:</span>{" "}
                  {message.text}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm text-center font-medium text-indigo-600 hover:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              close
            </button>
          </div>
        </div>
      ));

      setUnseenMessages((prev) => [...prev, message]);
    };

    const memberRemovedHandler = (data: {
      groupId: string;
      removedUser: User;
      removedBy: User;
      group: Group;
    }) => {
      if (data.removedUser.id === sessionId) {
        // Current user was removed from group
        setActiveGroups((prev) =>
          prev.filter((group) => group.id !== data.groupId)
        );
        toast.error(
          `You were removed from ${data.group.name} by ${data.removedBy.name}`
        );
      } else {
        // Update group with new member list
        setActiveGroups((prev) =>
          prev.map((group) => (group.id === data.groupId ? data.group : group))
        );
      }
    };

    const newAdminHandler = (data: {
      groupId: string;
      newAdmin: User;
      promotedBy: User;
      group: Group;
    }) => {
      setActiveGroups((prev) =>
        prev.map((group) => (group.id === data.groupId ? data.group : group))
      );

      if (data.newAdmin.id === sessionId) {
        toast.success(`You are now an admin of ${data.group.name}`);
      }
    };

    pusherClient.bind("new_group", newGroupHandler);
    pusherClient.bind("new_group_message", groupMessageHandler);
    pusherClient.bind("member_removed", memberRemovedHandler);
    pusherClient.bind(
      "removed_from_group",
      (data: { groupId: string; groupName: string; removedBy: User }) => {
        setActiveGroups((prev) =>
          prev.filter((group) => group.id !== data.groupId)
        );
        toast.error(
          `You were removed from ${data.groupName} by ${data.removedBy.name}`
        );
      }
    );
    pusherClient.bind("new_admin", newAdminHandler);

    return () => {
      pusherClient.unsubscribe(toPusherKey(`user:${sessionId}:groups`));
      pusherClient.unbind("new_group", newGroupHandler);
      pusherClient.unbind("new_group_message", groupMessageHandler);
      pusherClient.unbind("member_removed", memberRemovedHandler);
      pusherClient.unbind("removed_from_group");
      pusherClient.unbind("new_admin", newAdminHandler);
    };
  }, [pathname, sessionId, router]);

  useEffect(() => {
    if (pathname?.includes("group")) {
      setUnseenMessages((prev) => {
        return prev.filter((message) => !pathname.includes(message.groupId));
      });
    }
  }, [pathname]);

  return (
    <ul role="list" className="max-h-[25rem] overflow-y-auto -mx-2 space-y-1">
      {activeGroups
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((group) => {
          const unseenMessagesCount = unseenMessages.filter((message) => {
            return message.groupId === group.id;
          }).length;

          const isAdmin = group.admins.includes(sessionId);

          return (
            <li key={group.id}>
              <a
                href={`/dashboard/group/${group.id}`}
                className="text-gray-700 hover:text-indigo-600 hover:bg-gray-100 group flex items-center gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
              >
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                    <Users className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="truncate">{group.name}</span>
                    {isAdmin && (
                      <div className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                        <span className="text-xs text-yellow-800">👑</span>
                      </div>
                    )}
                  </div>
                </div>
                {unseenMessagesCount > 0 && (
                  <div className="bg-indigo-600 font-medium text-xs text-white w-4 h-4 rounded-full flex justify-center items-center">
                    {unseenMessagesCount}
                  </div>
                )}
              </a>
            </li>
          );
        })}
    </ul>
  );
};

export default SidebarGroupList;
