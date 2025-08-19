interface User {
  name: string;
  email: string;
  image: string;
  id: string;
}

interface Chat {
  id: string;
  messages: Messages[];
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

interface FreindRequest {
  id: string;
  senderId: string;
  receiverId: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  image?: string;
  createdBy: string;
  members: string[];
  admins: string[];
  createdAt: number;
}

interface GroupMessage {
  id: string;
  senderId: string;
  groupId: string;
  text: string;
  timestamp: number;
}

interface GroupMember {
  userId: string;
  groupId: string;
  role: "member" | "admin";
  joinedAt: number;
}
