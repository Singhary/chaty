import { fetchRedis } from "@/helpers/redis";
import { isGroupAdmin, isGroupMember } from "@/helpers/get-friend-user-id";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { makeAdminSchema } from "@/lib/Validations/group";
import { getServerSession } from "next-auth";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { groupId, userId } = makeAdminSchema.parse(body);

    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if the requester is an admin of the group
    const isAdmin = await isGroupAdmin(groupId, session.user.id);
    if (!isAdmin) {
      return new Response("Only admins can make other users admin", {
        status: 403,
      });
    }

    // Check if the user to be made admin is actually a member
    const isMember = await isGroupMember(groupId, userId);
    if (!isMember) {
      return new Response("User is not a member of this group", {
        status: 400,
      });
    }

    // Check if user is already an admin
    const isAlreadyAdmin = await isGroupAdmin(groupId, userId);
    if (isAlreadyAdmin) {
      return new Response("User is already an admin", { status: 400 });
    }

    // Get group data
    const groupData = (await fetchRedis("get", `group:${groupId}`)) as string;
    if (!groupData) {
      return new Response("Group not found", { status: 404 });
    }

    const group = JSON.parse(groupData) as Group;

    // Add user to admins
    const updatedAdmins = [...group.admins, userId];
    const updatedGroup: Group = {
      ...group,
      admins: updatedAdmins,
    };

    // Update group in Redis
    await Promise.all([
      // Update group data
      db.set(`group:${groupId}`, JSON.stringify(updatedGroup)),

      // Add to admins set
      db.sadd(`group:${groupId}:admins`, userId),
    ]);

    // Get user data for notifications
    const [newAdmin, promoter] = await Promise.all([
      fetchRedis("get", `user:${userId}`).then(
        (data) => JSON.parse(data as string) as User
      ),
      fetchRedis("get", `user:${session.user.id}`).then(
        (data) => JSON.parse(data as string) as User
      ),
    ]);

    // Notify all members about new admin
    await Promise.all(
      group.members.map((memberId) =>
        pusherServer.trigger(
          toPusherKey(`user:${memberId}:groups`),
          "new_admin",
          {
            groupId,
            newAdmin,
            promotedBy: promoter,
            group: updatedGroup,
          }
        )
      )
    );

    return new Response("User promoted to admin successfully", { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request payload", { status: 400 });
    }

    return new Response("Internal Server Error", { status: 500 });
  }
}
