import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { z } from "zod";

export async function POST(req:Request){
    try {
        const body = await req.json();
        const{id:idToDeny} = z.object({id:z.string()}).parse(body);
        
        const session = await getServerSession(authOptions);
        
        if(!session){
            return new Response('Not Logged In',{status:401});
        }
        
        const hasFriendRequest = await fetchRedis('sismember',`user:${session.user.id}:incoming_friend_requests`,idToDeny);
        
        if(!hasFriendRequest){
            return new Response('User has not sent you a friend request',{status:400});
        }
        
        //removing the friend request
        await db.srem(`user:${session.user.id}:incoming_friend_requests`,idToDeny);
        
        return new Response('Friend request denied',{status:200});
        
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