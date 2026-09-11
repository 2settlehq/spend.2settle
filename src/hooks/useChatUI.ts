import { useRef, useCallback } from "react";

export function useChatUI() {
  const chatboxRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const chatbox = chatboxRef.current;
      if (!chatbox) return;

      chatbox.scrollTo({
        top: chatbox.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  return {
    chatboxRef,
    messagesEndRef,
    textareaRef,
    scrollToBottom,
  };
}
