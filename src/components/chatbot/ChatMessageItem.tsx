import React from "react";
import Image from "next/image";
import { format } from "date-fns";
import { MessageType } from "stores/chatStore";
import { renderMessageContent } from "@/utils/renderMessageContent";
interface Props {
  msg: MessageType;
}

const ChatMessageItem = ({ msg }: Props) => {
  const isTransferForm =
    msg.intent?.kind === "component" && msg.intent.name === "TransferForm";

  return (
    <li
      className={`flex ${
        msg.type === "incoming" ? "items-start" : "justify-end"
      }`}
    >
      {msg.type === "incoming" && (
        <span className="mr-3 h-9 w-9 flex-shrink-0 self-end rounded bg-white">
          <Image
            src="/wale/wale-chat-icon.png"
            alt="Avatar"
            width={36}
            height={36}
            className="h-full w-full rounded object-cover"
          />
        </span>
      )}

      <div
        className={`flex flex-col ${
          isTransferForm ? "min-w-0 flex-1" : "max-w-[78%]"
        }`}
      >
        <div
          className={
            isTransferForm
              ? "leading-relaxed text-black"
              : `rounded-2xl px-4 py-3 leading-relaxed ${
                  msg.type === "incoming"
                    ? "rounded-bl-none bg-gray-200 text-black"
                    : "rounded-br-none bg-blue-500 text-white"
                }`
          }
        >
          {renderMessageContent(msg)}
        </div>

        <span
          className={`mt-1 px-1 text-xs text-gray-500 ${
            msg.type === "incoming" ? "self-end" : "self-start"
          }`}
        >
          {format(new Date(msg.timestamp), "h:mm a").toLowerCase()}
        </span>
      </div>
    </li>
  );
};

export default ChatMessageItem;
