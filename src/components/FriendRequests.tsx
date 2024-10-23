"use client"
import { pusherClient } from '@/lib/pusher';
import { toPusherKey } from '@/lib/utils';
import axios from 'axios';
import { Check, User, UserPlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Router } from 'next/router';
import { FC, useEffect, useState } from 'react'

interface FriendRequestsProps {
  incomingFriendRequests: IncomingFriendRequest[];
  sessionId: string;
}

const FriendRequests: FC<FriendRequestsProps> = ({incomingFriendRequests,sessionId}) => {
   const router = useRouter() ;
   console.log(incomingFriendRequests)
    const [friendRequest , setFriendRequest] = useState<IncomingFriendRequest[]>(incomingFriendRequests);
    
    useEffect(()=>{
       pusherClient.subscribe(toPusherKey(`user:${sessionId}:incoming_friend_requests`));

       const friendRequestHandler = ({senderId , senderEmail}:IncomingFriendRequest)=>{
          setFriendRequest((prev)=>[...prev,{
            senderId,
            senderEmail,
          }])
       }
        
       pusherClient.bind('incoming_friend_requests', friendRequestHandler);

       return ()=>{
          pusherClient.unsubscribe(toPusherKey(`user:${sessionId}:incoming_friend_request`));
          pusherClient.unbind('incoming_friend_request', friendRequestHandler);
       }
    },[])

    const acceptFriend = async (senderId: string) => {
      await axios.post('/api/friends/accept', { id: senderId })
  
      setFriendRequest((prev) =>
        prev.filter((request) => request.senderId !== senderId)
      )
  
      router.refresh()
    }
  
    const denyFriend = async (senderId: string) => {
      await axios.post('/api/friends/deny', { id: senderId })

      setFriendRequest((prev) =>
        prev.filter((request) => request.senderId !== senderId)
      )
      router.refresh()
    }
  

  return <>
  {console.log("incomingFriendRequests" , incomingFriendRequests)}
  {console.log("friendRequest" , friendRequest)}
   {friendRequest.length===0?(
        <div className='text-gray-400 text-center text-sm'>
        No friend request
        </div>
    ):(
      friendRequest.map((request)=>{
        return (
           <div key={request.senderId} className='flex gap-4 items-center'>
             <UserPlus className='text-black'/>
             <p className='font-medium text-lg'>{request.senderEmail}</p>
             <button aria-label='accept-friend' className='w-8 h-8 bg-indigo-600 hover:bg-indigo-700 grid place-items-center rounded-full transition hover:shadow-md' onClick={()=>acceptFriend(request.senderId)}>
                <Check className='font-semibold text-white w-3/4 h-3/4' />
             </button>

             <button aria-label='accept-friend' className='w-8 h-8 bg-red-600 hover:bg-red-700 grid place-items-center rounded-full transition hover:shadow-md' onClick={()=>denyFriend(request.senderId)}>
                <X className='font-semibold text-white w-3/4 h-3/4' />
             </button>
             
           </div>
        )
      })
    )}
  </>
}

export default FriendRequests