import { isGreeting } from "@/features/chatbot/helpers/ChatbotConsts";
import { shortWallet } from "@/helpers/ShortenAddress";
import { useWalletStore } from "@/hooks/wallet/useWalletStore";
import { resetAllTransactionState } from "@/utils/resetTransactionState";
import useChatStore from "stores/chatStore";
import { useUserStore } from "stores/userStore";

/**
 * Check if user has moved past the start step
 * If they're not at "start", we should ask if they want to reset
 */
const isNotAtStartStep = (): boolean => {
  const { currentStep } = useChatStore.getState();
  return currentStep.stepId !== "start";
};

/**
 * Display the reset confirmation prompt when user has an ongoing transaction
 */
export const displayResetConfirmation = () => {
  const { addMessages, next } = useChatStore.getState();
  const { user } = useUserStore.getState();
  const telFirstName = user?.telegram?.username;

  addMessages([
    {
      type: "incoming",
      content: (
        <span>
          How far {telFirstName} 👋
          <br />
          <br />
          You have an ongoing transaction. What would you like to do?
          <br />
          <br />
          1. Start fresh (reset current transaction) <br />
          2. Continue with current transaction
        </span>
      ),
      timestamp: new Date(),
    },
  ]);

  next({
    stepId: "confirmResetChat",
    transactionType: undefined,
  });
};

/**
 * Proceed with the normal welcome flow (after reset or no active transaction)
 */
export const proceedWithWelcome = () => {
  const { next, addMessages } = useChatStore.getState();
  const { user } = useUserStore.getState();

  // Reset all transaction data
  resetAllTransactionState();

  const { isConnected, address } = useWalletStore.getState();
  const walletIsConnected = isConnected;
  const wallet = address;
  const telFirstName = user?.telegram?.username;

  if (walletIsConnected) {
    addMessages?.([
      {
        type: "incoming",
        content: (
          <span>
            How far {telFirstName} 👋
            <br />
            <br />
            You are connected as <b>{shortWallet(wallet)}</b>
            <br />
            <br />
            1. To disconnect wallet <br />
            2. Continue to transact
          </span>
        ),
        timestamp: new Date(),
      },
    ]);
  } else {
    addMessages?.([
      {
        type: "incoming",
        content: (
          <span>
            How far {telFirstName}👋
            <br />
            <br />
            Welcome to 2SettleHQ!, my name is Wálé, I am 2settle virtual
            assistance, <br />
            <b>Your wallet is not connected,</b> reply with:
            <br />
            <br />
            1. To connect wallet <br />
            2. To just continue
          </span>
        ),
        timestamp: new Date(),
      },
    ]);
  }

  next({
    stepId: "chooseAction",
    transactionType: undefined,
  });
};

export const displayWelcomeMenu = (chatInput?: string) => {
  const { addMessages } = useChatStore.getState();
  const { user } = useUserStore.getState();
  const telFirstName = user?.telegram?.username;

  console.log("User chatinput", chatInput);

  if (isGreeting(chatInput ?? "")) {
    // If user is past the start step, ask if they want to reset
    if (isNotAtStartStep()) {
      displayResetConfirmation();
    } else {
      proceedWithWelcome();
    }
  } else {
    addMessages?.([
      {
        type: "incoming",
        content: (
          <span>
            How far {telFirstName}👋
            <br />
            <br />
            It seems you entered the wrong respose, try <b>hi,</b> <b>hey,</b>{" "}
            <b>hello</b> or <b>howdy</b>
          </span>
        ),
        timestamp: new Date(),
      },
    ]);
  }
};
