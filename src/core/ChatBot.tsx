"use client";

import ErrorBoundary from "@/components/social/telegram/TelegramError";
import { withErrorHandling } from "@/components/withErrorHandling";
import ChatLayout from "@/hooks/chatbot/chatLayout";
import { useChatLogic } from "@/hooks/chatbot/useChatLogic";
import { useChatState } from "@/hooks/chatbot/useChatState";
import { useChatUI } from "@/hooks/useChatUI";
import { useGroupedMessages } from "@/hooks/useGroupedMessages";
import { ChatBotProps } from "@/types/chatbot_types";
import { GeistSans } from "geist/font/sans";
import { useEffect } from "react";
import useChatStore from "stores/chatStore";

const ChatBot = ({ isMobile, onClose }: ChatBotProps) => {
  const {
    chatInput,
    setChatInput,
    messages,
    chatMessages,
    addChatMessages,
    currentDate,
  } = useChatState();
  const loading = useChatStore((s) => s.loading);

  const { chatboxRef, messagesEndRef, textareaRef, scrollToBottom } =
    useChatUI();

  const groupedMessages = useGroupedMessages(chatMessages);

  const { handleConversation } = useChatLogic({
    addChatMessages,
    setChatInput,
    currentStep: "start",
    onError: (err: Error) => console.log(err),
  });

  useEffect(scrollToBottom, [chatMessages, scrollToBottom]);

  const layout = (
    <ChatLayout
      chatInput={chatInput}
      onChange={(e) => setChatInput(e.target.value)}
      onSubmit={handleConversation}
      groupedMessages={groupedMessages}
      loading={loading}
      dateSeperatorBadge={(dateString) => (
        <li className="flex justify-center py-1 text-[10px]">
          <span className="px-3 py-1">{dateString}</span>
        </li>
      )}
      messagesEndRef={messagesEndRef}
      chatboxRef={chatboxRef}
      showDateDropdown={true}
      currentDate={currentDate}
      onClose={onClose}
      textareaRef={textareaRef}
    />
  );

  return (
    <ErrorBoundary>
      {isMobile ? (
        <div
          className={`${GeistSans.className} fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-white text-sm [&_button]:text-xs [&_input]:text-xs [&_textarea]:text-sm`}
        >
          {layout}
        </div>
      ) : (
        <div
          className={`${GeistSans.className} fixed bottom-24 right-8 flex h-[min(560px,calc(100dvh-14rem))] w-[min(440px,calc(100vw-4rem))] min-h-0 flex-col overflow-hidden rounded-[2rem] bg-white text-sm shadow-2xl [&_button]:text-xs [&_input]:text-xs [&_textarea]:text-sm`}
        >
          {layout}
        </div>
      )}
    </ErrorBoundary>
  );
};
export default withErrorHandling(ChatBot);
