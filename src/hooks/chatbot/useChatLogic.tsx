import { handleCharge } from "@/features/chatbot/handlers/chatHandlers/charge";
import { connectWallet } from "@/features/chatbot/handlers/chatHandlers/chatbot.parent";
import { choiceMenu } from "@/features/chatbot/handlers/chatHandlers/choice.menu";
import { handleChooseTransactionType } from "@/features/chatbot/handlers/chatHandlers/choose.transaction.type";
import { handleContinueToPay } from "@/features/chatbot/handlers/chatHandlers/complete.payement";
import { handleConfirmResetChat } from "@/features/chatbot/handlers/chatHandlers/confirm.reset.chat";
import { handlePhoneNumber } from "@/features/chatbot/handlers/chatHandlers/enter.phone";
import { handleAiChat } from "@/features/chatbot/handlers/chatHandlers/handle.ai.chat";
import {
  handleBankAccountNumber,
  handleSearchBank,
  handleSelectBank,
} from "@/features/chatbot/handlers/chatHandlers/handle.bank.steps";
import { handleClaimGift } from "@/features/chatbot/handlers/chatHandlers/handle.claim.gift";
import { handlePayRequest } from "@/features/chatbot/handlers/chatHandlers/handle.pay.request";
import { handleCompleteTransactionId } from "@/features/chatbot/handlers/chatHandlers/handle.transaction.id";
import { handleMakeAChoice } from "@/features/chatbot/handlers/chatHandlers/make.choice";
import { helloMenu } from "@/features/chatbot/handlers/chatHandlers/hello.menu";
import { displayWelcomeMenu } from "@/features/chatbot/handlers/chatHandlers/menus/welcome";
import {
  handleFraudsterWalletAddress,
  handleMakeReport,
  handleReporterName,
  handleReporterPhoneNumber,
  handleReporterWalletAddress,
  handleReportlyNote,
} from "@/features/chatbot/handlers/chatHandlers/reportly/handle.reportly";
import { handleNetwork } from "@/features/chatbot/handlers/chatHandlers/network";
import { handlePayOptions } from "@/features/chatbot/handlers/chatHandlers/payment.options";
import { requestPayCard } from "@/features/chatbot/handlers/chatHandlers/request.pay.card";
import { handleCryptoPayment } from "@/features/chatbot/handlers/chatHandlers/send.payment";
import { handleTransactCrypto } from "@/features/chatbot/handlers/chatHandlers/transact.crypto";
import { handleTransferMoney } from "@/features/chatbot/handlers/chatHandlers/transfer.money";
import { greetings } from "@/features/chatbot/helpers/ChatbotConsts";

import { Dispatch, SetStateAction } from "react";
import useChatStore, { MessageType } from "stores/chatStore";

export interface ChatLogicProps {
  addChatMessages: (messages: MessageType[]) => void;
  setChatInput: Dispatch<SetStateAction<string>>;
  currentStep: string;
  onError?: (error: Error) => void;
}

export const useChatLogic = ({
  addChatMessages,
  setChatInput,
  onError,
}: ChatLogicProps) => {
  const currentStep = useChatStore((s) => s.currentStep);
  const { setLoading } = useChatStore.getState();

  const handleConversation = async (chatInput: string) => {
    setLoading(true);
    try {
      if (!chatInput.trim()) return;

      addChatMessages([
        {
          type: "outgoing",
          content: <span>{chatInput}</span>,
          timestamp: new Date(),
        },
      ]);
      setChatInput("");

      // greetings logic
      if (greetings.includes(chatInput.trim().toLowerCase())) {
        console.log("We are resetting to handle greeting...");
        console.log("Current Step:", currentStep);
        await stepHandlers["start"](chatInput);
      } else {
        console.log("Current Step:", currentStep);

      //  await handleAiChat(chatInput)
       await stepHandlers[currentStep.stepId as StepId](chatInput);
      }
    } catch (error) {
      console.error(error);
      onError?.(error instanceof Error ? error : new Error("Unknown error"));
      addChatMessages([
        {
          type: "incoming",
          content: <span>Something went wrong.</span>,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return { handleConversation };
};

const steps = [
  "start",
  "confirmResetChat",
  "connectWallet",
  "chooseAction",
  "makeAChoice",
  "chooseTransactionType",
  "transactCrypto",
  "requestPayCard",
  "transferMoney",
  "howToEstimate",
  "network",
  "payOptions",
  "charge",
  "enterBankSearchWord",
  "selectBank",
  "enterAccountNumber",
  "continueToPay",
  "enterPhone",
  "sendPayment",
  "claimGift",
  "payRequest",
  "assurance",
  "completeTransactionId",
  "makeReport",
  "reporterName",
  "reporterPhoneNumber",
  "reporterWallet",
  "fraudsterWallet",
  "reportlyNote",
  "reporterFarwell",
] as const;

type StepId = (typeof steps)[number];

const stepHandlers: Record<
  StepId,
  (chatInput: string) => Promise<void> | void
> = {
  start: async (chatInput) => displayWelcomeMenu(chatInput),
  confirmResetChat: async (chatInput) => handleConfirmResetChat(chatInput),
  connectWallet: async () => connectWallet(), // I will work on thisn later
  // choose what you want to do in 2settle (transactCrypto, ...reportly)
  chooseAction: async (chatInput) => choiceMenu(chatInput),
  // choose what you want to do in transact crypto
  makeAChoice: async (chatInput) => handleMakeAChoice(chatInput),
  // choose how you want to estimate the payment
  chooseTransactionType: async (chatInput) =>
    handleChooseTransactionType(chatInput),
  // choose what currency you want to use (naira, dollar, crypto)
  transactCrypto: async (chatInput) => handleTransactCrypto(chatInput),
  // this handles the network
  network: async (chatInput) => handleNetwork(chatInput),
  // calculates the charge and give user option to choose
  charge: async (chatInput) => handleCharge(chatInput),
  // allow user to enter bank search word
  enterBankSearchWord: async (chatInput) => handleSearchBank(chatInput),
  // allow user select bank from list
  selectBank: async (chatInput) => handleSelectBank(chatInput),
  // allow user enter account number
  enterAccountNumber: async (chatInput) => handleBankAccountNumber(chatInput),
  // continue to pay
  continueToPay: async (chatInput) => handleContinueToPay(chatInput),
  // use give there phone
  enterPhone: async (chatInput) => handlePhoneNumber(chatInput),
  // allow user send their crypto payment
  sendPayment: async (chatInput) => handleCryptoPayment(chatInput),
  makeReport: async (chatInput) => handleMakeReport(chatInput),
  reporterName: async (chatInput) => handleReporterName(chatInput),
  reporterPhoneNumber: async (chatInput) => handleReporterPhoneNumber(chatInput),
  reporterWallet: async (chatInput) => handleReporterWalletAddress(chatInput),
  fraudsterWallet: async (chatInput) => handleFraudsterWalletAddress(chatInput),
  reportlyNote: async (chatInput) => handleReportlyNote(chatInput),
  reporterFarwell: async (chatInput) => helloMenu(chatInput),
  howToEstimate: async () => console.log("transferMoney step"),
  transferMoney: async (chatInput) => handleTransferMoney(chatInput),
  payOptions: async (chatInput) => handlePayOptions(chatInput),
  completeTransactionId: async (chatInput) =>
    handleCompleteTransactionId(chatInput),
  claimGift: async (chatInput) => handleClaimGift(chatInput),
  payRequest: async (chatInput) => handlePayRequest(chatInput),
  requestPayCard: async () => requestPayCard(),
  assurance: async () => console.log("assurance step"),
};
