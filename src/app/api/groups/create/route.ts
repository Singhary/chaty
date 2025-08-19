import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { createGroupSchema } from "@/lib/Validations/group";
import { getServerSession } from "next-auth";
import { nanoid } from "nanoid";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, members } = createGroupSchema.parse(body);

    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Create group ID
    const groupId = nanoid();

    // Include creator in members
    const allMembers = Array.from(new Set([session.user.id, ...members]));

    // Verify all members are friends of the creator
    const friendIds = (await fetchRedis(
      "smembers",
      `user:${session.user.id}:friends`
    )) as string[];
    const invalidMembers = members.filter(
      (memberId) =>
        memberId !== session.user.id && !friendIds.includes(memberId)
    );

    if (invalidMembers.length > 0) {
      return new Response("Can only add friends to group", { status: 400 });
    }

    // Create group object
    const group: Group = {
      id: groupId,
      name,
      description: description || "",
      createdBy: session.user.id,
      members: allMembers,
      admins: [session.user.id], // Creator is admin by default
      createdAt: Date.now(),
    };

    // Store group in Redis
    await Promise.all([
      // Store group data
      db.set(`group:${groupId}`, JSON.stringify(group)),

      // Add group to each member's group list
      ...allMembers.map((memberId) =>
        db.sadd(`user:${memberId}:groups`, groupId)
      ),

      // Store members and admins in sets for quick lookup
      db.sadd(
        `group:${groupId}:members`,
        ...(allMembers as [string, ...string[]])
      ),
      db.sadd(`group:${groupId}:admins`, session.user.id),
    ]);

    // Notify all members about new group
    const creator = (await fetchRedis(
      "get",
      `user:${session.user.id}`
    )) as string;
    const creatorData = JSON.parse(creator) as User;

    await Promise.all(
      allMembers.map((memberId) =>
        pusherServer.trigger(
          toPusherKey(`user:${memberId}:groups`),
          "new_group",
          {
            group,
            createdBy: creatorData,
          }
        )
      )
    );

    return new Response("Group created successfully", { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request payload", { status: 400 });
    }

    return new Response("Internal Server Error", { status: 500 });
  }
}
