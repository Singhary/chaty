import AddFriendButton from '@/components/AddFriendButton';
import FriendRequests from '@/components/FriendRequests';
import { fetchRedis } from '@/helpers/redis';
import { authOptions } from '@/lib/auth'
import { getServerSession, User } from 'next-auth'
import { FC } from 'react'

const  page: FC = async({}) => {
    const session = await getServerSession(authOptions) ;

    if(!session){
        return <div>Unauthorized</div>
    }

    //id of people who sent friend request
    const incomingSenderIds = await fetchRedis('smembers' , `user:${session.user.id}:incoming_friend_requests`) as string[];
    
    //to get the email of the people who sent friend request
    const incomingFriendRequest = await Promise.all(incomingSenderIds.map(async(senderId)=>{
        const sender = await fetchRedis('get',`user:${senderId}` ).then((data)=>JSON.parse(data)) as User ;
        return {
            senderId,
            senderEmail:sender.email,
            }
        })
    )

  return <main className='pt-8'>
  <h1 className='font-bold text-5xl mb-8'>Add a Friend</h1>
  <div className='flex flex-col gap-4'>
     <FriendRequests incomingFriendRequests={incomingFriendRequest} sessionId={session.user.id}/>
  </div>
</main>
}

export default page