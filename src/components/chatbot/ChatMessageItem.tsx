import React from "react";
import Image from "next/image";
import { format } from "date-fns";
import { MessageType } from "stores/chatStore";
import { renderMessageContent } from "@/utils/renderMessageContent";
interface Props {
  msg: MessageType;
  grouped?: boolean;
  showAvatar?: boolean;
}

const ChatMessageItem = ({ msg, grouped = false, showAvatar = true }: Props) => {
  const incoming = msg.type === "incoming";
  const timestamp = new Date(msg.timestamp);
  const time = format(timestamp, "h:mm a").toLowerCase();
  const isStructuredComponent =
    msg.intent?.kind === "component" &&
    [
      "TransferForm",
      "PaymentDetails",
      "GiftCode",
      "GiftForm",
      "RequestPaymentForm",
      "ClaimGiftForm",
      "FulfillRequestForm",
      "ReportForm",
    ].includes(msg.intent.name);

  return (
    <li
      className={`flex min-w-0 max-w-full items-end ${grouped ? "mt-1" : "mt-3"} ${incoming ? "justify-start" : "justify-end"}`}
    >
      {incoming && (
        <span className="mr-1.5 w-6 flex-shrink-0 self-end">
          {showAvatar && (
            <Image
              src="/wale/wale-chat-icon.png"
              alt="Wálé"
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-cover"
            />
          )}
        </span>
      )}

      <div
        className={`flex flex-col ${
          isStructuredComponent ? "min-w-0 flex-1" : "min-w-0 max-w-[85%]"
        }`}
      >
        <div
          className={
            isStructuredComponent
              ? "break-words text-sm leading-[1.5] text-black [overflow-wrap:anywhere]"
              : `break-words rounded-2xl px-3 py-2 text-sm leading-[1.5] [overflow-wrap:anywhere] ${
                  incoming
                    ? "rounded-bl-sm bg-gray-200 text-black"
                    : "rounded-br-sm bg-blue-500 text-white"
                }`
          }
        >
          {renderMessageContent(msg)}
          {!isStructuredComponent && (
            <time
              dateTime={timestamp.toISOString()}
              className={`mt-1 block text-right text-[10px] leading-3 ${incoming ? "text-gray-500" : "text-white/80"}`}
            >
              {time}
            </time>
          )}
        </div>

        {isStructuredComponent && (
          <time
            dateTime={timestamp.toISOString()}
            className="mt-1 self-end px-1 text-[10px] leading-3 text-gray-500"
          >
            {time}
          </time>
        )}
      </div>
    </li>
  );
};

export default ChatMessageItem;
