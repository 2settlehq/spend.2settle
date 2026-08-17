import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StepId } from "@/core/machines/steps";
import elementToJSXString from "react-element-to-jsx-string";
import parse from "html-react-parser";

type MessageIntent =
  | { kind: "text"; value: string }
  | { kind: "component"; name: string; props?: any; persist?: boolean };

// serialized message can have content and/or intent
type SerializedMessage = {
  type: string;
  content?: string; 
  intent?: MessageIntent; 
  timestamp: string | Date;
};

export type MessageType = {
  type: string;
  content?: string | React.ReactNode;
  intent?: MessageIntent;
  timestamp: Date;
};

interface StepContext {
  stepId: StepId;
  transactionType?: "transfer" | "gift" | "request" | "payrequest";
}

type StepContextPatch = Partial<StepContext>;
const sanitizeSerializedContent = (content: string) => {
  return content
    .replace(/\{['"]\s*['"]\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
};
const serializeMessage = (msg: MessageType) => ({
  type: msg.type,
  content: sanitizeSerializedContent(elementToJSXString(msg.content)),
  timestamp: msg.timestamp || new Date(),
});

// when desireialing the message, we can have content, intent or both in a message
const deserializeMessage = (msg: SerializedMessage): MessageType => {
  return {
    type: msg.type,
    content: msg.content ? parse(msg.content) : undefined,
    intent: msg.intent,
    timestamp: new Date(msg.timestamp),
  };
};

const initialMessages = [
  {
    type: "incoming",
    content: (
      <span>
        How far 👋
        <br />
        <br />
        Welcome to 2SettleHQ!, my name is Wálé, I am 2settle virtual assistance,{" "}
        <br />
        How may I help you?
        <br />
        Say "Hi" let us start
      </span>
    ),
    timestamp: new Date(),
  },
];

type ChatStore = {
  messages: MessageType[];
  serialized: SerializedMessage[];
  stepHistory: StepContextPatch[];
  loading: boolean;
  // In-progress streamed AI reply text, rendered as a trailing bubble while
  // non-null. Deliberately kept out of `messages`/`serialized` and excluded
  // from persistence (see `partialize` below) — updating it at token rate
  // must not run the JSX-serialization + localStorage-write pipeline that
  // `addMessages` does. Once a stream finishes, the consumer clears this and
  // calls `addMessages` with the final text, same as any other message.
  streamingMessage: string | null;

  currentStep: StepContextPatch;

  addMessages: (msg: MessageType[]) => void;
  setSerialized: (msgs: any[]) => void;

  recordStep: (step: StepContextPatch) => void;
  getDeserializedMessages: () => MessageType[];

  setLoading: (loading: boolean) => void;
  setStreamingMessage: (text: string | null) => void;

  next: (step: StepContextPatch) => void;
  prev: () => void;
};

const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => {
      // --- Custom INITIALIZATION LOGIC ---
      let initialState;
      const MAX_MESSAGES = 100;

      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("chat-flow");

        if (stored) {
          const parsed = JSON.parse(stored).state; // Zustand persist wraps it in `.state`

          const deserialized = parsed.serialized.map(deserializeMessage);

          initialState = {
            messages: deserialized,
            serialized: parsed.serialized,
            currentStep: parsed.currentStep ?? {
              stepId: "start",
              transactionType: undefined,
            },
            stepHistory: parsed.stepHistory ?? [
              { stepId: "start", transactionType: undefined },
            ],
          };
        }
      }

      // If nothing exists in storage → use initial welcome message
      if (!initialState) {
        const serializedInitial = initialMessages.map(serializeMessage);

        initialState = {
          messages: initialMessages,
          serialized: serializedInitial,
          currentStep: {
            stepId: "start",
            transactionType: undefined,
          },
          stepHistory: [
            {
              stepId: "start",
              transactionType: undefined,
            },
          ],
        };
      }

      return {
        ...initialState,
        loading: false,
        streamingMessage: null,
        currentStep: {
          stepId: "start",
          transactionType: undefined,
        },

        setLoading: (loading: boolean) => set({ loading: loading }),
        setStreamingMessage: (text: string | null) =>
          set({ streamingMessage: text }),

        // when adding a message to the history, we serialize the JSX/text and save intent for components
        addMessages: (msgs) =>
          set((state) => {
            const serialized = msgs.map((msg) => {
              const base = {
                type: msg.type,
                timestamp: msg.timestamp,
              };

              return {
                ...base,
                ...(msg.content
                  ? {
                      content: sanitizeSerializedContent(
                        elementToJSXString(msg.content),
                      ),
                    }
                  : {}),
                ...(msg.intent &&
                  (msg.intent.kind !== "component" || msg.intent.persist
                    ? { intent: msg.intent }
                    : {})),
              };
            });

            const nextMessages = [...state.messages, ...msgs];
            const nextSerializedMessages = [...state.serialized, ...serialized];

            const overflow = nextMessages.length - MAX_MESSAGES;

            if (overflow > 0) {
              return {
                messages: nextMessages.slice(overflow),
                serialized: nextSerializedMessages.slice(overflow),
              };
            }

            return {
              messages: nextMessages,
              serialized: nextSerializedMessages,
            };
          }),

        setSerialized: (msgs) => set({ serialized: msgs }),

        recordStep: (step: StepContextPatch) =>
          set((state) => {
            if (state.stepHistory[state.stepHistory.length - 1] === step) {
              return { currentStep: { ...state.currentStep, ...step } };
            }
            return {
              currentStep: step,
              stepHistory: [
                ...state.stepHistory,
                { ...state.currentStep, ...step },
              ],
            };
          }),
        getDeserializedMessages: () => {
          return get().serialized.map(deserializeMessage);
        },

        next: (step: StepContextPatch) =>
          set((state) => ({
            stepHistory: [
              ...state.stepHistory,
              { ...state.currentStep, ...step },
            ],
            currentStep: {
              ...state.currentStep,
              ...step,
            },
          })),
        prev: () =>
          set((state) => {
            if (state.stepHistory.length <= 1) {
              return state; // prevent popping "start"
            }

            const newHistory = state.stepHistory.slice(0, -1);
            const previousStep = newHistory[newHistory.length - 1];

            return {
              stepHistory: newHistory,
              currentStep: previousStep,
            };
          }),
      };
    },
    {
      name: "chat-flow",
      // streamingMessage changes at token rate during an AI reply — it must
      // never be written to localStorage on every update.
      partialize: (state) => {
        const { streamingMessage, ...rest } = state;
        return rest;
      },
    },
  ),
);



export default useChatStore;
