import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { z } from "zod";

export  async function POST(req:Request){
  try {
    const body = await req.json() ;
    
    console.log(body);
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

    const[userRaw , friendRaw] = (await Promise.all([
      fetchRedis('get',`user:${session.user.id}`),
      fetchRedis('get',`user:${idToAdd}`)
    ])) as [string,string];

    const user = JSON.parse(userRaw) as User;
    const friend = JSON.parse(friendRaw) as User;

    await Promise.all([
      pusherServer.trigger(toPusherKey(`user:${idToAdd}:friends`),'new_friend',user),
      pusherServer.trigger(toPusherKey(`user:${session.user.id}:friends`), 'new_friend', friend),
      db.sadd(`user:${session.user.id}:friends`,idToAdd) ,
      db.sadd(`user:${idToAdd}:friends`,session.user.id) ,
      db.srem(`user:${session.user.id}:incoming_friend_requests`,idToAdd),
    ])

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