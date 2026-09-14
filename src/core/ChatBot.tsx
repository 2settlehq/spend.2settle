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

  useEffect(() => {
    if (!isMobile) return;

    const root = document.documentElement;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = root.style.overflow;
    const viewport = window.visualViewport;
    const initialHeight = window.innerHeight;
    const updateViewportHeight = () => {
      const height = viewport?.height ?? window.innerHeight;
      const keyboardOpen = initialHeight - height > 150;
      root.style.setProperty("--chat-viewport-height", `${height}px`);
      root.style.setProperty("--chat-viewport-top", `${viewport?.offsetTop ?? 0}px`);
      root.style.setProperty("--chat-bottom-inset", keyboardOpen ? "0px" : "env(safe-area-inset-bottom)");
      const chatbox = chatboxRef.current;
      const focusedField = document.activeElement;
      if (chatbox && focusedField instanceof HTMLElement && chatbox.contains(focusedField)) {
        requestAnimationFrame(() => focusedField.scrollIntoView({ block: "nearest" }));
      } else if (chatbox) {
        chatbox.scrollTop = chatbox.scrollHeight;
      }
    };

    document.body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    updateViewportHeight();
    viewport?.addEventListener("resize", updateViewportHeight);
    viewport?.addEventListener("scroll", updateViewportHeight);
    window.addEventListener("resize", updateViewportHeight);
    window.addEventListener("orientationchange", updateViewportHeight);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      root.style.overflow = previousRootOverflow;
      root.style.removeProperty("--chat-viewport-height");
      root.style.removeProperty("--chat-viewport-top");
      root.style.removeProperty("--chat-bottom-inset");
      viewport?.removeEventListener("resize", updateViewportHeight);
      viewport?.removeEventListener("scroll", updateViewportHeight);
      window.removeEventListener("resize", updateViewportHeight);
      window.removeEventListener("orientationchange", updateViewportHeight);
    };
  }, [isMobile, chatboxRef]);

  const layout = (
    <ChatLayout
      chatInput={chatInput}
      onChange={(e) => setChatInput(e.target.value)}
      onSubmit={handleConversation}
      groupedMessages={groupedMessages}
      loading={loading}
      dateSeperatorBadge={(dateString) => (
        <li className="flex justify-center py-3 text-[10px] text-gray-500">
          <span className="rounded-full bg-gray-100 px-3 py-1">{dateString}</span>
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
          className={`${GeistSans.className} fixed left-0 top-[var(--chat-viewport-top,0px)] flex h-[var(--chat-viewport-height,100dvh)] w-full max-w-full min-h-0 flex-col overflow-hidden bg-white text-sm [&_input]:text-base [&_textarea]:text-base md:[&_input]:text-xs md:[&_textarea]:text-sm`}
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
