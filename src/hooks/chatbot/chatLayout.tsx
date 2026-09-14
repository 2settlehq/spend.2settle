import ChatHeader from "@/components/chatbot/ChatHeader";
import ChatInput from "@/components/chatbot/ChatInput";
import ChatMessages from "@/components/chatbot/ChatMessages";

import { RefObject, ChangeEvent } from "react";
import { MessageType } from "stores/chatStore";

export interface ChatLayoutProps {
  chatInput: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (chatInput: string, onError?: (error: Error) => void) => void;
  groupedMessages: Record<string, MessageType[]>;
  loading: boolean;
  dateSeperatorBadge: (dateString: string) => JSX.Element;
  messagesEndRef: RefObject<HTMLDivElement>;
  chatboxRef: RefObject<HTMLDivElement>;
  showDateDropdown: boolean;
  currentDate: string | null;
  onClose: () => void;
  textareaRef: RefObject<HTMLTextAreaElement>; // optional if you want flexibility
}

const ChatLayout = ({
  chatInput,
  onChange,
  onSubmit,
  groupedMessages,
  loading,
  dateSeperatorBadge,
  messagesEndRef,
  chatboxRef,
  showDateDropdown,
  currentDate,
  onClose,
  textareaRef,
}: ChatLayoutProps) => {
  return (
    <>
      <ChatHeader
        onClose={onClose}
        showDateDropdown={showDateDropdown}
        currentDate={currentDate}
      />
      <ChatMessages
        groupedMessages={groupedMessages}
        loading={loading}
        dateSeperatorBadge={dateSeperatorBadge}
        messagesEndRef={messagesEndRef}
        chatboxRef={chatboxRef}
      />
      <ChatInput
        loading={loading}
        chatInput={chatInput}
        onChange={onChange}
        onSubmit={onSubmit}
        textareaRef={textareaRef}
      />
    </>
  );
};

export default ChatLayout;
