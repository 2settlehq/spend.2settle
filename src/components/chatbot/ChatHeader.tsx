import React from "react";
import Image from "next/image";
import { useOnlineStatus } from "./useOnlineStatus";
interface Props {
  onClose: () => void;
  showDateDropdown: boolean;
  currentDate: string | null;
  // isOnline: boolean;
}

const ChatHeader = ({ onClose, showDateDropdown, currentDate }: Props) => {
  const isOnline = useOnlineStatus();
  return (
    <header className="relative z-10 flex-shrink-0 bg-blue-500 pt-[env(safe-area-inset-top)] text-white shadow">
      <div className="flex min-h-[52px] items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="-ml-2 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-white/70"
          aria-label="Close chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <h2 className="min-w-0 flex-1 truncate text-left text-base font-bold">
          2SettleHQ
        </h2>

        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white">
          {isOnline ? (
            <Image
              src="/wale/wale-chat-icon.png"
              alt="Avatar"
              width={28}
              height={28}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <span
              className="text-md font-semibold text-red-600"
              title="You are offline"
            >
              ⚠️
            </span>
          )}
        </span>
      </div>
      {showDateDropdown && currentDate && (
        <div className="absolute left-1/2 top-full -translate-x-1/2 rounded-b-lg bg-gray-200 px-4 py-2 text-xs text-gray-700 shadow-md transition-all duration-300 ease-in-out">
          {currentDate}
        </div>
      )}
    </header>
  );
};

export default ChatHeader;
