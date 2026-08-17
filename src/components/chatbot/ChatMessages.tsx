import React, { ReactNode } from "react";
import Image from "next/image";
import ChatMessageItem from "./ChatMessageItem";
import Loader from "../shared/Loader";
import useChatStore, { MessageType } from "stores/chatStore";

interface Props {
  groupedMessages: Record<string, MessageType[]>;
  chatMessages: MessageType[];
  loading: boolean;
  dateSeperatorBadge: (dateString: string) => ReactNode;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  chatboxRef: React.RefObject<HTMLDivElement>;
}

const ChatMessages = ({
  groupedMessages,
  chatMessages,
  loading,
  dateSeperatorBadge,
  messagesEndRef,
  chatboxRef,
}: Props) => {
  const streamingMessage = useChatStore((s) => s.streamingMessage);

  return (
    <div className="flex-grow overflow-y-auto" ref={chatboxRef}>
      <ul className="p-4 space-y-4">
        {Object.entries(groupedMessages).map(([dateString, messages]) => (
          <React.Fragment key={dateString}>
            {dateSeperatorBadge(dateString)}
            {/* ${visibleDateSeparators.has(dateString) ? "" : "hidden"} */}
            {chatMessages.map((msg, index) => (
              <ChatMessageItem
                msg={msg}
                dateString={dateString}
                index={index}
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
            dateString="streaming"
            index={-1}
          />
        ) : (
          loading && (
            <div className="flex items-center">
              <span className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 mr-2 md:mr-4 mt-2 bg-white rounded">
                <Image
                  src="/wale/waaa.png"
                  alt="Avatar"
                  width={32}
                  height={32}
                  className="rounded"
                />
              </span>
              <div className="bg-gray-200 relative left-1 top-1 rounded-bl-none pr-2 pt-2 pl-2 pb-1 md:pr-4 md:pt-4 md:pl-3 md:pb-2 rounded-lg mr-12 md:mr-48">
                <div className="flex justify-start">
                  <Loader />
                </div>
              </div>
            </div>
          )
        )}
      </ul>
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
