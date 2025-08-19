"use client";
import { pusherClient } from "@/lib/pusher";
import { cn, toPusherKey } from "@/lib/utils";
import { Message } from "@/lib/Validations/message";
import Image from "next/image";
import { FC, useEffect, useRef, useState } from "react";

interface MessagesProps {
  initialMessages: Message[];
  sessionId: string;
  chatId: string;
  sessionImg: string | null | undefined;
  chatPartner?: User;
  isGroupChat?: boolean;
  groupMembers?: User[];
}

const Messages: FC<MessagesProps> = ({
  initialMessages,
  sessionId,
  chatPartner,
  sessionImg,
  chatId,
  isGroupChat = false,
  groupMembers = [],
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const scrollDownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const channelKey = isGroupChat ? `group:${chatId}` : `chat:${chatId}`;
    pusherClient.subscribe(toPusherKey(channelKey));

    const messageHandler = (message: Message) => {
      setMessages((prev) => [message, ...prev]);
    };

    pusherClient.bind("incoming-message", messageHandler);

    return () => {
      pusherClient.unsubscribe(toPusherKey(channelKey));
      pusherClient.unbind("incoming-message", messageHandler);
    };
  }, [chatId, isGroupChat]);

  const getMemberImage = (senderId: string) => {
    if (senderId === sessionId) return sessionImg;
    if (isGroupChat) {
      const member = groupMembers.find((m) => m.id === senderId);
      return member?.image || "";
    }
    return chatPartner?.image || "";
  };

  const getMemberName = (senderId: string) => {
    if (senderId === sessionId) return "You";
    if (isGroupChat) {
      const member = groupMembers.find((m) => m.id === senderId);
      return member?.name || "Unknown";
    }
    return chatPartner?.name || "";
  };

  return (
    <div
      id="messages"
      className="flex h-full flex-1 flex-col-reverse gap-4 p-3 overflow-y-auto scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch"
    >
      <div ref={scrollDownRef} />

      {messages.map((message, index) => {
        const isCurrentUser = message.senderId === sessionId;

        //The below line check if the current message is from the same sender as the previous message because we want to show the sender's name only once
        const hasNextMessageFromSameSenderId =
          messages[index - 1]?.senderId === messages[index]?.senderId;

        return (
          <div
            key={`${message.id}-${message.timestamp}`}
            className="chat-message"
          >
            <div
              className={cn("flex items-end", {
                "justify-end": isCurrentUser,
              })}
            >
              <div
                className={cn(
                  "flex flex-col space-y-2 text-base max-w-xs mx-2",
                  {
                    "order-1 items-end": isCurrentUser,
                    "order-2 items-start": !isCurrentUser,
                  }
                )}
              >
                {/* Show sender name in group chats */}
                {isGroupChat &&
                  !isCurrentUser &&
                  !hasNextMessageFromSameSenderId && (
                    <span className="text-xs text-gray-500 px-2">
                      {getMemberName(message.senderId)}
                    </span>
                  )}

                <span
                  className={cn("px-4 py-2 rounded-lg inline-block", {
                    "bg-indigo-600 text-white": isCurrentUser,
                    "bg-gray-200 text-gray-900": !isCurrentUser,
                    "rounded-br-none":
                      !hasNextMessageFromSameSenderId && isCurrentUser,
                    "rounded-bl-none":
                      !hasNextMessageFromSameSenderId && !isCurrentUser,
                  })}
                >
                  {message.text}{" "}
                  <span className="ml-2 text-xs text-gray-400">
                    {new Date(message.timestamp).toLocaleString()}
                  </span>
                </span>
              </div>
              <div
                className={cn("relative w-6 h-6", {
                  "order-2": isCurrentUser,
                  "order-1": !isCurrentUser,
                  invisible: hasNextMessageFromSameSenderId,
                })}
              >
                <Image
                  fill
                  src={getMemberImage(message.senderId) as string}
                  alt="user_image"
                  referrerPolicy="no-referrer"
                  className="rounded-full"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Messages;
