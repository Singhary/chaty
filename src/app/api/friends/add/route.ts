import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addFriendSchema } from "@/lib/Validations/add-friend";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(req:Request , res:Response){
    try {
       const body = await req.json();
       const{email:emailToAdd} = addFriendSchema.parse(body.email);

      const idToAdd = await fetchRedis('get',`user:email:${emailToAdd}`) as string|null;
      
        if(!idToAdd){
            return new Response('User not found',{status:404});
     }
       
       const session = await getServerSession(authOptions);
       
       if(idToAdd === session?.user.id){
             return new Response('You cannot add yourself',{status:400});       
       }

       if(!session){
         return new Response('Unauthorized',{status:401});
       }
       
       //checking if user is already added 
        const isAlreadyAdded = await fetchRedis('sismember',`user:${idToAdd}:incoming_friend_requests`,session.user.id) as 0|1;

        if(isAlreadyAdded){
            return new Response('User already added',{status:400});
        }

        const isAlreadyFriend = await fetchRedis('sismember',`user:${idToAdd}:friends`,session.user.id) as 0|1;

        if(isAlreadyFriend){
            return new Response('User already friend',{status:400});
        }

        //sending friend request
        db.sadd(`user:${idToAdd}:incoming_friend_requests`,session.user.id);

        return new Response('Friend request sent',{status:200});
    } catch (error) {

        if(error instanceof z.ZodError){
            return new Response(error.message,{status:400});
        }

        if(error instanceof fetch){
            return new Response('Failed to fetch data from Redis',{status:500});
        }
        return new Response('An error occurred',{status:500});
    }
}