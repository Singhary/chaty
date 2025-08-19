import {
  getFriendsByUserId,
  getGroupsByUserId,
} from "@/helpers/get-friend-user-id";
import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { chatHrefConstructor } from "@/lib/utils";
import { ChevronRight, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const Page = async () => {
  const session = await getServerSession(authOptions);

  if (!session) {
    notFound();
  }

  const [friends, groups] = await Promise.all([
    getFriendsByUserId(session.user.id),
    getGroupsByUserId(session.user.id),
  ]);

  const friendWithLastMessage = await Promise.all(
    friends.map(async (friend) => {
      const [lastMessage] = (await fetchRedis(
        "zrange",
        `chat:${chatHrefConstructor(session.user.id, friend.id)}:messages`,
        -1,
        -1
      )) as string[];

      return {
        ...friend,
        lastMessage: lastMessage ? JSON.parse(lastMessage) : null,
        type: "friend" as const,
      };
    })
  );

  const groupsWithLastMessage = await Promise.all(
    groups.map(async (group) => {
      const [lastMessage] = (await fetchRedis(
        "zrange",
        `group:${group.id}:messages`,
        -1,
        -1
      )) as string[];

      return {
        ...group,
        lastMessage: lastMessage ? JSON.parse(lastMessage) : null,
        type: "group" as const,
      };
    })
  );

  // Helper function to get member name for group messages
  const getMemberName = async (senderId: string): Promise<string> => {
    try {
      const userData = (await fetchRedis("get", `user:${senderId}`)) as string;
      const user = JSON.parse(userData) as User;
      return user.name;
    } catch {
      return "Unknown";
    }
  };

  // Get member names for group messages
  const groupsWithMemberNames = await Promise.all(
    groupsWithLastMessage.map(async (group) => {
      if (group.lastMessage && group.lastMessage.senderId !== session.user.id) {
        const memberName = await getMemberName(group.lastMessage.senderId);
        return {
          ...group,
          lastMessageSenderName: memberName,
        };
      }
      return {
        ...group,
        lastMessageSenderName: null,
      };
    })
  );

  // Combine and sort by last message timestamp
  const allChats = [...friendWithLastMessage, ...groupsWithMemberNames]
    .filter((chat) => chat.lastMessage) // Only show chats with messages
    .sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || 0;
      const bTime = b.lastMessage?.timestamp || 0;
      return bTime - aTime; // Most recent first
    });

  return (
    <div className="container py-12">
      <h1 className="font-bold text-5xl mb-8">Recent Chats</h1>
      {allChats.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing To Show Here</p>
      ) : (
        <div className="space-y-3">
          {allChats.map((chat) => (
            <div
              key={`${chat.type}-${chat.id}`}
              className="relative bg-zinc-50 border border-zinc-200 p-3 rounded-md hover:bg-zinc-100 transition-colors"
            >
              <div className="absolute right-4 inset-y-0 flex items-center">
                <ChevronRight className="h-7 w-7 text-zinc-400" />
              </div>

              <Link
                href={
                  chat.type === "friend"
                    ? `/dashboard/chat/${chatHrefConstructor(
                        session.user.id,
                        chat.id
                      )}`
                    : `/dashboard/group/${chat.id}`
                }
                className="relative sm:flex"
              >
                <div className="mb-4 flex-shrink-0 sm:mb-0 sm:mr-4">
                  <div className="relative h-12 w-12">
                    {chat.type === "friend" ? (
                      <Image
                        referrerPolicy="no-referrer"
                        className="rounded-full"
                        alt={`${chat.name} profile picture`}
                        src={chat.image}
                        fill
                      />
                    ) : (
                      <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-lg font-semibold truncate">
                      {chat.name}
                    </h4>
                    {chat.type === "group" && (
                      <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded-full flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>Group</span>
                      </span>
                    )}
                    {chat.type === "group" &&
                      chat.admins?.includes(session.user.id) && (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          Admin
                        </span>
                      )}
                  </div>
                  {chat.lastMessage && (
                    <p className="mt-1 max-w-md text-sm text-zinc-600 truncate">
                      <span className="text-zinc-400">
                        {chat.type === "friend"
                          ? chat.lastMessage.senderId === session.user.id
                            ? "You: "
                            : `${chat.name}: `
                          : chat.lastMessage.senderId === session.user.id
                          ? "You: "
                          : `${chat.lastMessageSenderName || "Unknown"}: `}
                      </span>
                      {chat.lastMessage.text}
                    </p>
                  )}
                  {chat.type === "group" && (
                    <p className="text-xs text-zinc-400 mt-1">
                      {chat.members?.length || 0} members
                    </p>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Page;
