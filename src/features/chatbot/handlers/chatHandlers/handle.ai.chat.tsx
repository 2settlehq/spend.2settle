import { geminiAi } from "@/services/ai/ai-services";
import useChatStore, { MessageType } from "stores/chatStore";

type CopyableReplyItem = {
  label: string;
  text: string;
  isWallet?: boolean;
  reference?: string;
  paymentType?: string;
  expiresAt?: string | null;
};

const COPYABLE_REPLY_FIELDS: Array<{
  label: string;
  patterns: RegExp[];
}> = [
  {
    label: "Wallet Address",
    patterns: [
      /wallet\s*address\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9:_-]{5,})/i,
      /wallet_address\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9:_-]{5,})/i,
    ],
  },
  {
    label: "Transaction ID",
    patterns: [
      /transaction\s*id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
      /transaction_id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
      /transact_id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
    ],
  },
  {
    label: "Gift ID",
    patterns: [
      /gift\s*id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
      /gift_id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
    ],
  },
  {
    label: "Transfer ID",
    patterns: [
      /transfer\s*id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
      /transfer_id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
    ],
  },
  {
    label: "Request ID",
    patterns: [
      /request\s*id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
      /request_id\s*(?:is|:|-)?\s*([A-Za-z0-9][A-Za-z0-9_-]{5,})/i,
    ],
  },
];

const cleanCopyableValue = (value: string) =>
  value.replace(/^[`"'(<\[]+|[`"').,;:>\]]+$/g, "").trim();

const getCopyableReplyItems = (reply = ""): CopyableReplyItem[] => {
  const items: CopyableReplyItem[] = [];
  const seen = new Set<string>();

  COPYABLE_REPLY_FIELDS.forEach(({ label, patterns }) => {
    for (const pattern of patterns) {
      const match = reply.match(pattern);
      const text = match?.[1] ? cleanCopyableValue(match[1]) : "";

      if (!text || ["undefined", "null", "none"].includes(text.toLowerCase())) {
        continue;
      }

      const key = `${label}:${text}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ label, text });
      }
      break;
    }
  });

  return items;
};

const mergeCopyableItems = (
  structuredItems: CopyableReplyItem[] = [],
  fallbackItems: CopyableReplyItem[] = [],
) => {
  const seen = new Set<string>();

  return [...structuredItems, ...fallbackItems].filter((item) => {
    const text = item.text?.trim();
    if (!text) return false;

    const key = `${item.label}:${text}`;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
};

export const handleAiChat = async (chatInput?: string) => {
  const { addMessages } = useChatStore.getState();
  try {
    console.log("we are at the start");

    // window.localStorage.setItem("transactionID", "");

    const messages: any = [];
    const updatedMessages = [...messages, { role: "user", content: chatInput }];
    let sessionId = window.localStorage.getItem("transactionID");

    // ✅ If it doesn't exist, create and store it
    if (!sessionId) {
      sessionId = Math.floor(100000 + Math.random() * 900000).toString();
      window.localStorage.setItem("transactionID", sessionId);
      console.log("Generated new sessionId:", sessionId);
    } else {
      console.log("Using existing sessionId:", sessionId);
    }
    console.log("Generated new sessionId:", chatInput);
    // const reply = await OpenAI(updatedMessages, sessionId);
    const reply = await geminiAi(chatInput, sessionId);
    console.log("this is the response from backend", reply.reply);
    const copyableItems = mergeCopyableItems(
      reply.copyableItems,
      getCopyableReplyItems(reply.reply),
    );
    const shouldShowTransferTimeNotice = copyableItems.some(
      (item) => item.isWallet || item.label.toLowerCase() === "wallet address",
    );
    const walletItem = copyableItems.find(
      (item) => item.isWallet || item.label.toLowerCase() === "wallet address",
    );
    const walletExpiryTime = walletItem?.expiresAt
      ? new Date(walletItem.expiresAt)
      : new Date(Date.now() + 30 * 60 * 1000);

    const incomingMessages: MessageType[] = [
      {
        type: "incoming",
        content: <span>{reply.reply}</span>, // simplified: just the assistant's latest reply
        timestamp: new Date(),
      },
      ...(shouldShowTransferTimeNotice
        ? [
            {
              type: "incoming",
              content: (
                <div className="flex flex-col items-center">
                  <p className="mb-4">
                    <b>Please Note</b>
                    <br />
                    Make sure you complete the transfer within <b>30 mins</b>
                  </p>
                </div>
              ),
              timestamp: new Date(),
            },
          ]
        : []),
      ...copyableItems.map((item) => ({
        type: "incoming",
        intent: {
          kind: "component" as const,
          name: "CopyableText",
          props: {
            text: item.text,
            label: item.label,
            isWallet: item.isWallet,
            reference: item.reference,
            paymentType: item.paymentType,
            lastAssignedTime: item.expiresAt ? new Date(item.expiresAt) : undefined,
          },
          persist: true,
        },
        timestamp: new Date(),
      })),
      ...(walletItem
        ? [
            {
              type: "incoming",
              intent: {
                kind: "component" as const,
                name: "CountdownTimer",
                props: {
                  expiryTime: walletExpiryTime,
                  reference: walletItem.reference,
                },
                persist: true,
              },
              timestamp: new Date(),
            },
          ]
        : []),
    ];

    addMessages?.(incomingMessages);
  } catch (err) {
    console.error("There was an error from backend", err);
    addMessages?.([
      {
        type: "incoming",
        content: (
          <span>
            😓 Sorry, something went wrong while processing your request.
            <br />
            Please try again in a moment.
          </span>
        ),
        timestamp: new Date(),
      },
    ]);
  }
};
