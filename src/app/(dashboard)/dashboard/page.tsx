import { getFriendsByUserId } from '@/helpers/get-friend-user-id';
import { fetchRedis } from '@/helpers/redis';
import { authOptions } from '@/lib/auth'
import { chatHrefConstructor } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { getServerSession } from 'next-auth'
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FC } from 'react'
import { json } from 'stream/consumers';

interface pageProps {
}

const Page= async() => {
   
  const session = await getServerSession(authOptions);

  if(!session){
     notFound();
  }

  const friends = await getFriendsByUserId(session.user.id) ;

  const friendWithLastMessage = await Promise.all(
     friends.map(async(friends)=>{
         const [lastMessage] = await fetchRedis('zrange', `chat:${chatHrefConstructor(session.user.id,friends.id)}:messages`,-1,-1);

         return{
              ...friends,
              lastMessage: JSON.parse(lastMessage)
         }
     })
  )

  return (
    <div className='container py-12'>
      <h1 className='font-bold text-5xl mb-8'>Recent Chats</h1>
      {friendWithLastMessage.length === 0 ?<p className='text-sm text-zinc-500'>Nothing To Show Here</p>:(
        friendWithLastMessage.map((friend)=>(
          <div key={friend.id} className='relative bg-zinc-50 border-zinc-200 p-3 rounded-md'>
            <div className='absolute right-4 inset-y-0 flex items-center'>
               <ChevronRight className='h-7 w-7 text-zinc-400'/>
            </div>

            <Link href={`/dashboard/chat/${chatHrefConstructor(session.user.id,friend.id)}`} className='relative sm:flex'>
              <div className='mb-4 flex-shrink-0 sm:mb-0 sm:mr-4'>
                <div className="relative h-6 w-6">
                  <Image referrerPolicy='no-referrer' className='rounded-full' alt={`${friend.name} profile pricture`} src={friend.image} fill/>
                </div>
              </div>
              <div>
                <h4 className='text-lg font-semibold'>{friend.name}</h4>
                <p className='mt-1 max-w-md'>
                  <span className='text-zinc-400'>
                    {friend.lastMessage.senderId === session.user.id
                      ? 'You: '
                      : `${friend.name}: `}
                  </span>
                  {friend.lastMessage.text}
                </p>
              </div>
            </Link>
          </div>
        ))
      )}

    </div>
  )
}

export default Page