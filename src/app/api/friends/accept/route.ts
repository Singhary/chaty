import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { getServerSession } from "next-auth";
import { z } from "zod";

export  async function POST(req:Request , res:Response){
  try {
    const body = await req.json() ;
    
    //to check if user is making a valide request
    const{id:idToAdd} = z.object({id:z.string()}).parse(body);

    const session = await getServerSession(authOptions);

    if(!session){
        return new Response('Not Logged In',{status:401});
    }

    //verify that both user are not already friend
    const isAlreadyFriend = await fetchRedis('sismember', `user:${session.user.id}:friends` , idToAdd) ;

    if(isAlreadyFriend){
        return new Response('User already friend',{status:400});
    }
   
    const hasFriendRequest = await fetchRedis('sismember',`user:${session.user.id}:incoming_friend_requests`,idToAdd);

    if(!hasFriendRequest){
        return new Response('User has not sent you a friend request',{status:400});
    }

    pusherServer.trigger(`user:${idToAdd}:friends`,'new_friend','')

    //Now we can add the user as friend

    await db.sadd(`user:${session.user.id}:friends`,idToAdd) ;
    await db.sadd(`user:${idToAdd}:friends`,session.user.id) ;

    //removing the friend request
    await db.srem(`user:${session.user.id}:incoming_friend_requests`,idToAdd);

    return new Response('Friend added',{status:200});

  } catch (error) {
    
    if(error instanceof z.ZodError){
        return new Response('Invalid request Payload',{status:400});
    }

    if(error instanceof fetch){
        return new Response('Failed to fetch data from Redis',{status:500});
    }

    return new Response('Invalid_Request',{status:400});
  }
}