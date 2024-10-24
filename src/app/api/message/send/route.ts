import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import {nanoid} from 'nanoid';
import { Message, messageValidator } from "@/lib/Validations/message";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";

export async function POST(req:Request){
    try {
        const{text,chatId} = await req.json();
        const session = await getServerSession(authOptions);
        if(!session){
            return new Response('Unauthorized',{status:401});
        }

        const[userId1 , userId2] = chatId.split('--');

        if(session.user.id !== userId1 && session.user.id !== userId2){
            return new Response('Unauthorized',{status:401});
        }

        const friendId = session.user.id === userId1 ? userId2 : userId1 ;

        //now we will if the chad id is in user friend list
        const friendList = await fetchRedis('smembers',`user:${session.user.id}:friends`) as string[];
        const isFriend = friendList.includes(friendId);

        if(!isFriend){
            return new Response('Unauthorized',{status:401});
        }

        const sender = await fetchRedis('get', `user:${session.user.id}`).then((user)=>JSON.parse(user)) as User;

        //Now we can send the message
        const messageData:Message = {
            id:nanoid(),
            senderId:session.user.id,
            text,
            timestamp:Date.now()
        }

        const message = messageValidator.parse(messageData);

        //notifying the chat member for a channel
        await pusherServer.trigger(toPusherKey(`chat:${chatId}`), 'incoming-message', message);
        
        //for any message that the user recieves
        await pusherServer.trigger(toPusherKey(`user:${friendId}:chats`), 'new_message', {
            ...message,
            senderImg:sender.image,
            senderName:sender.name,
        })

        await db.zadd(`chat:${chatId}:messages`,{
            score:Date.now(),
            member:JSON.stringify(message)
        })

        return new Response('Message sent',{status:200});
    } catch (error) {
        if(error instanceof Error){
            return new Response(error.message,{status:500});
        }
        return new Response('Internal Server Error',{status:500});
    }
}