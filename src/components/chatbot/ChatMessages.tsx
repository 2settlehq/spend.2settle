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
      className="min-h-0 flex-1 overflow-y-auto bg-white overscroll-contain"
      ref={chatboxRef}
    >
      <ul className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
        {Object.entries(groupedMessages).map(([dateString, messages]) => (
          <React.Fragment key={dateString}>
            {dateSeperatorBadge(dateString)}
            {messages.map((msg, index) => (
              <ChatMessageItem
                key={`${dateString}-${index}`}
                msg={msg}
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
            <div className="flex items-center">
              <span className="mr-3 mt-2 h-9 w-9 flex-shrink-0 self-end rounded bg-white">
                <Image
                  src="/wale/wale-chat-icon.png"
                  alt="Avatar"
                  width={36}
                  height={36}
                  className="h-full w-full rounded object-cover"
                />
              </span>
              <div className="relative left-1 top-1 mr-12 rounded-2xl rounded-bl-none bg-gray-200 px-4 py-3">
                <div className="flex justify-start">
                  <Loader />
                </div>
              </div>
            </div>
          )
        )}
      </ul>
      <div ref={messagesEndRef} />
    </main>
  );
};

export default ChatMessages;
