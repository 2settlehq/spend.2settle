import React, { useLayoutEffect } from "react";
import SendIcon from "@mui/icons-material/Send";

interface Props {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  chatInput: string;
  loading?: boolean;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  onSubmit: (
    chatInput: string,
    onError?: ((error: Error) => void) | undefined
  ) => void;
}

const ChatInput = ({
  textareaRef,
  chatInput,
  onChange,
  onSubmit,
  loading = false,
}: Props) => {
  const canSend = Boolean(chatInput.trim()) && !loading;

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 40), 112)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 112 ? "auto" : "hidden";
  }, [chatInput, textareaRef]);

  const sendMessage = () => {
    if (canSend) onSubmit(chatInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <footer className="chat-composer flex-shrink-0 border-t border-gray-200 bg-white px-3 pb-[calc(0.5rem+var(--chat-bottom-inset,env(safe-area-inset-bottom)))] pt-2">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 rounded-[22px] border border-gray-200 bg-gray-50 px-3.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10">
          <textarea
            ref={textareaRef}
            value={chatInput}
            onChange={onChange}
            onKeyDown={handleKeyPress}
            className="block max-h-28 min-h-10 w-full min-w-0 resize-none border-none bg-transparent px-0 py-2.5 text-base leading-5 outline-none placeholder:text-gray-400 md:text-sm"
            placeholder="Enter a message..."
            aria-label="Message 2settle"
            enterKeyHint="send"
            rows={1}
            spellCheck={false}
            required
          />
        </div>
        <button
          type="button"
          onClick={sendMessage}
          disabled={!canSend}
          onMouseDown={(event) => event.preventDefault()}
          className="inline-flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-white transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-default disabled:opacity-40"
          aria-label="Send message"
        >
          <SendIcon sx={{ fontSize: 20 }} />
        </button>
      </div>
    </footer>
  );
};
export default ChatInput;
