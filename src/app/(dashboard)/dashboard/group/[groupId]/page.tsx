import GroupMembers from "@/components/GroupMembers";
import Messages from "@/components/Messages";
import ChatInput from "@/components/ChatInput";
import { fetchRedis } from "@/helpers/redis";
import { isGroupAdmin, isGroupMember } from "@/helpers/get-friend-user-id";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { FC } from "react";
import { Settings, Users } from "lucide-react";

interface PageProps {
  params: {
    groupId: string;
  };
}

async function getGroupMessages(groupId: string) {
  try {
    const results: string[] = await fetchRedis(
      "zrange",
      `group:${groupId}:messages`,
      0,
      -1
    );

    const dbMessages = results.map(
      (message) => JSON.parse(message) as GroupMessage
    );
    const reversedDbMessages = dbMessages.reverse();

    return reversedDbMessages;
  } catch (error) {
    notFound();
  }
}

const page: FC<PageProps> = async ({ params }) => {
  const { groupId } = params;

  const session = await getServerSession(authOptions);
  if (!session) {
    notFound();
  }

  // Check if user is a member of the group
  const isMember = await isGroupMember(groupId, session.user.id);
  if (!isMember) {
    notFound();
  }

  // Get group data
  const groupData = (await fetchRedis("get", `group:${groupId}`)) as string;
  if (!groupData) {
    notFound();
  }

  const group = JSON.parse(groupData) as Group;
  const isCurrentUserAdmin = await isGroupAdmin(groupId, session.user.id);

  // Get all group members data
  const members = await Promise.all(
    group.members.map(async (memberId) => {
      const memberData = (await fetchRedis(
        "get",
        `user:${memberId}`
      )) as string;
      return JSON.parse(memberData) as User;
    })
  );

  const initialMessages = await getGroupMessages(groupId);

  return (
    <div className="flex h-full max-h-[calc(100vh-6rem)]">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Group Header */}
        <div className="flex sm:items-center justify-between py-3 border-b-2 border-gray-200 px-4">
          <div className="relative flex items-center space-x-4">
            <div className="relative">
              <div className="relative w-8 sm:w-12 h-8 sm:h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                <Users className="w-4 sm:w-6 h-4 sm:h-6 text-white" />
              </div>
            </div>

            <div className="flex flex-col leading-tight">
              <div className="text-xl flex items-center">
                <span className="text-gray-700 mr-3 font-semibold">
                  {group.name}
                </span>
                {isCurrentUserAdmin && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Admin
                  </span>
                )}
              </div>
              <span className="text-gray-600 text-sm">
                {group.members.length} members
                {group.description && ` • ${group.description}`}
              </span>
            </div>
          </div>

          {/* Group settings button for admins */}
          {isCurrentUserAdmin && (
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <Messages
            initialMessages={initialMessages.map((msg) => ({
              id: msg.id,
              senderId: msg.senderId,
              receiverId: "", // Not used for group messages
              text: msg.text,
              timestamp: msg.timestamp,
            }))}
            sessionId={session.user.id}
            chatId={groupId}
            sessionImg={session.user.image}
            chatPartner={{} as User} // We'll handle group member images differently
            isGroupChat={true}
            groupMembers={members}
          />
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-200">
          <ChatInput
            chatPartner={{ name: group.name } as User}
            chatId={groupId}
            isGroupChat={true}
          />
        </div>
      </div>

      {/* Group Members Panel */}
      <div className="w-80 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
        <GroupMembers
          group={group}
          members={members}
          sessionId={session.user.id}
          isCurrentUserAdmin={isCurrentUserAdmin}
        />
      </div>
    </div>
  );
};

export default page;
