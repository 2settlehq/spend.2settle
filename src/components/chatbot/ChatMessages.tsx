import React, { ReactNode } from "react";
import Image from "next/image";
import ChatMessageItem from "./ChatMessageItem";
import Loader from "../shared/Loader";
import useChatStore, { MessageType } from "stores/chatStore";

interface Props {
  groupedMessages: Record<string, MessageType[]>;
  loading: boolean;
  dateSeperatorBadge: (dateString: string) => ReactNode;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  chatboxRef: React.RefObject<HTMLDivElement>;
}

const ChatMessages = ({
  groupedMessages,
  loading,
  dateSeperatorBadge,
  messagesEndRef,
  chatboxRef,
}: Props) => {
  const streamingMessage = useChatStore((s) => s.streamingMessage);

  return (
    <main
      className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-white overscroll-contain"
      ref={chatboxRef}
    >
      <ul aria-label="Conversation with 2settle" className="min-w-0 px-2.5 pb-3 pt-1 sm:px-4">
        {Object.entries(groupedMessages).map(([dateString, messages]) => (
          <React.Fragment key={dateString}>
            {dateSeperatorBadge(dateString)}
            {messages.map((msg, index) => (
              <ChatMessageItem
                key={`${dateString}-${index}`}
                msg={msg}
                grouped={
                  index > 0 &&
                  messages[index - 1].type === msg.type &&
                  new Date(msg.timestamp).getTime() -
                    new Date(messages[index - 1].timestamp).getTime() <
                    5 * 60 * 1000
                }
                showAvatar={
                  index === messages.length - 1 ||
                  messages[index + 1].type !== msg.type
                }
              />
            ))}
          </React.Fragment>
        ))}
        {streamingMessage ? (
          <ChatMessageItem
            msg={{
              type: "incoming",
              content: <span>{streamingMessage}</span>,
              timestamp: new Date(),
            }}
          />
        ) : (
          loading && (
            <li aria-label="2settle is typing" className="mt-3 flex items-end">
              <span className="mr-1.5 h-6 w-6 flex-shrink-0 rounded-full bg-white">
                <Image
                  src="/wale/wale-chat-icon.png"
                  alt="Avatar"
                  width={24}
                  height={24}
                  className="h-full w-full rounded-full object-cover"
                />
              </span>
              <div className="rounded-2xl rounded-bl-sm bg-gray-200 px-3 py-2.5">
                <div className="flex justify-start">
                  <Loader />
                </div>
              </div>
            </li>
          )
        )}
      </ul>
      <div ref={messagesEndRef} />
    </main>
  );
};

export default ChatMessages;
