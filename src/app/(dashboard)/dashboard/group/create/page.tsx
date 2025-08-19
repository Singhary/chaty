import CreateGroup from "@/components/CreateGroup";
import { getFriendsByUserId } from "@/helpers/get-friend-user-id";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { FC } from "react";

const page: FC = async () => {
  const session = await getServerSession(authOptions);

  if (!session) {
    notFound();
  }

  const friends = await getFriendsByUserId(session.user.id);

  return (
    <main className="pt-8">
      <h1 className="font-bold text-5xl mb-8">Create a Group</h1>
      <CreateGroup friends={friends} />
    </main>
  );
};

export default page;
