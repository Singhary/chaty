import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  members: z.array(z.string()).min(1).max(50),
});

export const addGroupMemberSchema = z.object({
  groupId: z.string(),
  userId: z.string(),
});

export const removeGroupMemberSchema = z.object({
  groupId: z.string(),
  userId: z.string(),
});

export const makeAdminSchema = z.object({
  groupId: z.string(),
  userId: z.string(),
});

export const groupMessageSchema = z.object({
  groupId: z.string(),
  text: z.string().min(1),
});

export type CreateGroupData = z.infer<typeof createGroupSchema>;
export type AddGroupMemberData = z.infer<typeof addGroupMemberSchema>;
export type RemoveGroupMemberData = z.infer<typeof removeGroupMemberSchema>;
export type MakeAdminData = z.infer<typeof makeAdminSchema>;
export type GroupMessageData = z.infer<typeof groupMessageSchema>;
