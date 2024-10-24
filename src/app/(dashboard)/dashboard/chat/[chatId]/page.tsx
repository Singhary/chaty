import ChatInput from '@/components/ChatInput';
import Messages from '@/components/Messages';
import { fetchRedis } from '@/helpers/redis';
import { authOptions } from '@/lib/auth';
import { messageArrayValidator } from '@/lib/Validations/message';
import { getServerSession } from 'next-auth';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { FC } from 'react'

interface PageProps {
  params:{
    chatId: string
  }
}

async function getChatMessages(chatId:string){
  try {
    const results:string[] = await fetchRedis('zrange', `chat:${chatId}:messages`, 0 , -1)

    const dbMessages = results.map((message)=>JSON.parse(message) as Message);

    const reversedDbMessages = dbMessages.reverse();

    const messages = messageArrayValidator.parse(reversedDbMessages);

    return messages;
  } catch (error) {
    notFound();
  }
}

const page = async({params}:PageProps) => {
   
  const{chatId} = params;

  const session = await getServerSession(authOptions);
  if(!session){
    return <div>Unauthorized</div>
  }

  const{user} = session ;

  //This is an array of two user ids separated by '--' and it came from the chatId in the URL 
  const [userId1 , userId2] = chatId.split('--') ;
  if(user.id !== userId1 && user.id !== userId2){
    return <div>Unauthorized</div>
  }

  const chatPartnerId = user.id === userId1 ? userId2 : userId1 ;
  const chatPartner = await fetchRedis('get', `user:${chatPartnerId}`).then((image)=>JSON.parse(image)) as User;
  const initalMessages = await getChatMessages(chatId);

  return <div className='flex-1 justify-between flex flex-col h-full max-h-[calc(100vh-6rem)]'>
     <div className='flex sm:items-center justify-between py-3 border-b-2 border-gray-200'>
        <div className='relative flex items-center space-x-4'>
          <div className='relative'>
            <div className='relative w-8 sm:w-12 h-8 sm:h-12'>
              <Image 
                fill
                referrerPolicy='no-referrer'
                src={chatPartner.image}
                className='rounded-full'
                alt='profile image'
                />
            </div>
          </div>  

          <div className='flex flex-col leading-tight'>
            <div className='text-xl flex items-center'>
              <span className='text-gray-700 mr-3 font-semibold'>{chatPartner.name}</span>
            </div>
             <span className='text-gray-600 text-sm'>{chatPartner.email}</span>
          </div>
      </div>
    </div>
    <Messages initialMessages={initalMessages} sessionId={session.user.id} chatPartner={chatPartner} sessionImg={session.user.image} chatId={chatId}/>
    <ChatInput chatPartner={chatPartner} chatId={chatId}/>
  </div>
}

export default page