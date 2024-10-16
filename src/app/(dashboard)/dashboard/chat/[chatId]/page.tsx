import { fetchRedis } from '@/helpers/redis';
import { authOptions } from '@/lib/auth';
import { messageArrayValidator } from '@/lib/Validations/message';
import { getServerSession } from 'next-auth';
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
  const chatPartner = await fetchRedis('get', `user:${chatPartnerId}`) as User | null;
  const initalMessages = await getChatMessages(chatId);












  return <div>{params.chatId}</div>
}

export default page