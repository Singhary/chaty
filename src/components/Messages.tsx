'use client'
import { Message } from '@/lib/Validations/message';
import { FC, useRef, useState } from 'react'

interface MessagesProps {
  initialMessages:Message[];
  sessionId:string;
}

const Messages: FC<MessagesProps> = ({initialMessages , sessionId}) => {
    
    const[messages, setMessages] = useState<Message[]>(initialMessages);
    const scrollDownRef = useRef<HTMLDivElement|null>(null);


  return <div id='messages' className='flex h-full flex-1 flex-col-reverse gap-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch'>
      <div ref={scrollDownRef}/>

      {messages.map((message,index)=>{
         const isCurrentUser = message.senderId === sessionId;
         
         //The below line check if the cuurent message is from the same sender as the previous message because we want to show the sender's name only once
         const hasNextMessageFromSameSenderId = messages[index-1]?.senderId === messages[index]?.senderId ;

            return <div key={`${message.id}-${message.timestamp}`} className='chat-message'>


            </div>
      })}
      

    </div>
}

export default Messages