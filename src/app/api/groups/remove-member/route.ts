import { fetchRedis } from "@/helpers/redis";
import { isGroupAdmin, isGroupMember } from "@/helpers/get-friend-user-id";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { removeGroupMemberSchema } from "@/lib/Validations/group";
import { getServerSession } from "next-auth";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { groupId, userId } = removeGroupMemberSchema.parse(body);

    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if the requester is an admin of the group
    const isAdmin = await isGroupAdmin(groupId, session.user.id);
    if (!isAdmin) {
      return new Response("Only admins can remove members", { status: 403 });
    }

    // Check if the user to be removed is actually a member
    const isMember = await isGroupMember(groupId, userId);
    if (!isMember) {
      return new Response("User is not a member of this group", {
        status: 400,
      });
    }

    // Get group data
    const groupData = (await fetchRedis("get", `group:${groupId}`)) as string;
    if (!groupData) {
      return new Response("Group not found", { status: 404 });
    }

    const group = JSON.parse(groupData) as Group;

    // Prevent removing the group creator unless they're removing themselves
    if (group.createdBy === userId && session.user.id !== userId) {
      return new Response("Cannot remove group creator", { status: 403 });
    }

    // Remove member from group
    const updatedMembers = group.members.filter((id) => id !== userId);
    const updatedAdmins = group.admins.filter((id) => id !== userId);

    const updatedGroup: Group = {
      ...group,
      members: updatedMembers,
      admins: updatedAdmins,
    };

    // Update group in Redis
    await Promise.all([
      // Update group data
      db.set(`group:${groupId}`, JSON.stringify(updatedGroup)),

      // Remove group from user's group list
      db.srem(`user:${userId}:groups`, groupId),

      // Remove from members and admins sets
      db.srem(`group:${groupId}:members`, userId),
      db.srem(`group:${groupId}:admins`, userId),
    ]);

    // Get user data for notifications
    const [removedUser, remover] = await Promise.all([
      fetchRedis("get", `user:${userId}`).then(
        (data) => JSON.parse(data as string) as User
      ),
      fetchRedis("get", `user:${session.user.id}`).then(
        (data) => JSON.parse(data as string) as User
      ),
    ]);

    // Notify all remaining members about member removal
    await Promise.all([
      // Notify removed user
      pusherServer.trigger(
        toPusherKey(`user:${userId}:groups`),
        "removed_from_group",
        {
          groupId,
          groupName: group.name,
          removedBy: remover,
        }
      ),

      // Notify remaining members
      ...updatedMembers.map((memberId) =>
        pusherServer.trigger(
          toPusherKey(`user:${memberId}:groups`),
          "member_removed",
          {
            groupId,
            removedUser,
            removedBy: remover,
            group: updatedGroup,
          }
        )
      ),
    ]);

    return new Response("Member removed successfully", { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request payload", { status: 400 });
    }

    return new Response("Internal Server Error", { status: 500 });
  }
}
