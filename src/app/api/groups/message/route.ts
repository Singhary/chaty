import { fetchRedis } from "@/helpers/redis";
import { isGroupMember } from "@/helpers/get-friend-user-id";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { groupMessageSchema } from "@/lib/Validations/group";
import { getServerSession } from "next-auth";
import { nanoid } from "nanoid";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { groupId, text } = groupMessageSchema.parse(body);

    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Check if user is a member of the group
    const isMember = await isGroupMember(groupId, session.user.id);
    if (!isMember) {
      return new Response("You are not a member of this group", {
        status: 403,
      });
    }

    // Get group data
    const groupData = (await fetchRedis("get", `group:${groupId}`)) as string;
    if (!groupData) {
      return new Response("Group not found", { status: 404 });
    }

    const group = JSON.parse(groupData) as Group;
    const sender = await fetchRedis("get", `user:${session.user.id}`).then(
      (data) => JSON.parse(data as string) as User
    );

    // Create group message
    const messageData: GroupMessage = {
      id: nanoid(),
      senderId: session.user.id,
      groupId,
      text,
      timestamp: Date.now(),
    };

    // Store message in Redis
    await db.zadd(`group:${groupId}:messages`, {
      score: Date.now(),
      member: JSON.stringify(messageData),
    });

    // Notify all group members
    await Promise.all([
      // Notify group channel
      pusherServer.trigger(
        toPusherKey(`group:${groupId}`),
        "incoming-message",
        messageData
      ),

      // Notify each member's personal channel for unseen message handling
      ...group.members
        .filter((memberId) => memberId !== session.user.id)
        .map((memberId) =>
          pusherServer.trigger(
            toPusherKey(`user:${memberId}:groups`),
            "new_group_message",
            {
              ...messageData,
              senderImg: sender.image,
              senderName: sender.name,
              groupName: group.name,
            }
          )
        ),
    ]);

    return new Response("Message sent", { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request payload", { status: 400 });
    }

    return new Response("Internal Server Error", { status: 500 });
  }
}
