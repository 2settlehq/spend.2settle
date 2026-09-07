import { ConnectWalletWithChat } from "@/features/chatbot/handlers/chatHandlers/chatbot.parent";
import { CopyableText } from "@/features/transact/CopyableText";
import { CountdownTimer } from "@/helpers/format_date";
import ConfirmAndProceedButton from "@/hooks/chatbot/confirmButtonHook";
import TransferForm from "@/components/chatbot/TransferForm";
import React from "react";
import { MessageType } from "stores/chatStore";

const componentMap: Record<string, React.ComponentType<any>> = {
  ConnectButton: ConnectWalletWithChat,
  ConfirmAndProceedButton,
  CopyableText,
  CountdownTimer,
  TransferForm,
};

export const renderMessageContent = (msg: MessageType) => {
  const intent = msg.intent;

  return (
    <div className="flex flex-col gap-3">
      {/* Main message content */}
      {msg.content &&
        (typeof msg.content === "string" ? (
          <p className="text-sm md:text-base">{msg.content}</p>
        ) : (
          <span>{msg.content}</span>
        ))}

      {/* Intent rendering */}
      {intent?.kind === "component" &&
        (() => {
          const Comp = componentMap[intent.name];
          if (!Comp) return null;

          return (
            <div className="flex justify-center">
              <Comp {...intent.props} />
            </div>
          );
        })()}

      {intent?.kind === "text" && (
        <p className="text-sm md:text-base">{intent.value}</p>
      )}
    </div>
  );
};
