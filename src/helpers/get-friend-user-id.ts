import { fetchRedis } from "./redis";

export const getFriendsByUserId = async (userId: string) => {
  //retrive the friends of the user from the redis database

  const friendIds = (await fetchRedis(
    "smembers",
    `user:${userId}:friends`
  )) as string[];

  const friends = await Promise.all(
    friendIds.map(async (friendId) => {
      const friend = (await fetchRedis("get", `user:${friendId}`)) as string;
      const parsedFriend = JSON.parse(friend);
      return parsedFriend;
    })
  );

  return friends;
};

export const getGroupsByUserId = async (userId: string): Promise<Group[]> => {
  const groupIds = (await fetchRedis(
    "smembers",
    `user:${userId}:groups`
  )) as string[];

  const groups = await Promise.all(
    groupIds.map(async (groupId) => {
      const group = (await fetchRedis("get", `group:${groupId}`)) as string;
      return JSON.parse(group) as Group;
    })
  );

  return groups;
};

export const isGroupAdmin = async (
  groupId: string,
  userId: string
): Promise<boolean> => {
  const isAdmin = (await fetchRedis(
    "sismember",
    `group:${groupId}:admins`,
    userId
  )) as 0 | 1;
  return isAdmin === 1;
};

export const isGroupMember = async (
  groupId: string,
  userId: string
): Promise<boolean> => {
  const isMember = (await fetchRedis(
    "sismember",
    `group:${groupId}:members`,
    userId
  )) as 0 | 1;
  return isMember === 1;
};
