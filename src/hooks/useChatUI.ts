import { useEffect, useRef, useCallback } from "react";

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

  useEffect(() => {
    if (!chatboxRef.current) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      const maxHeight = window.innerHeight * 0.75;
      if (entry.contentRect.height > maxHeight) {
        chatboxRef.current!.style.height = `${maxHeight}px`;
      }
    });

    resizeObserver.observe(chatboxRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return {
    chatboxRef,
    messagesEndRef,
    textareaRef,
    scrollToBottom,
  };
}
