import { greetings } from "../../helpers/ChatbotConsts";
import { helloMenu } from "./hello.menu";
import useChatStore from "stores/chatStore";
import { usePaymentStore } from "stores/paymentStore";
import { displayHowToEstimation } from "./menus/how.to.estimate";
import { displayEnterPhone } from "./menus/display.phone";
import { getWalletNetworkError } from "@/lib/wallets/walletNetworks";

const USDT_NETWORKS: Record<string, "ERC20" | "TRC20" | "BEP20"> = {
  "1": "ERC20",
  "2": "TRC20",
  "3": "BEP20",
};

export const handleNetwork = async (chatInput: string) => {
  const { next, addMessages } = useChatStore.getState();
  const { paymentMode, rate, setAssetPrice, setCrypto, setTicker, setNetwork } =
    usePaymentStore.getState();

  setAssetPrice(rate);

  const isRequest = paymentMode.toLowerCase() === "payrequest";
  const usdtNetwork = USDT_NETWORKS[chatInput.trim()];

  if (greetings.includes(chatInput.trim().toLowerCase())) {
    helloMenu(chatInput);
  } else if (chatInput === "00") {
    helloMenu("hi");
  } else if (chatInput === "0") {
    //   displayTransferMoney();
  } else if (usdtNetwork) {
    // A connected wallet can only be debited on its own chain
    const walletError = getWalletNetworkError([usdtNetwork]);
    if (walletError) {
      addMessages([
        { type: "incoming", content: walletError, timestamp: new Date() },
      ]);
      return;
    }

    setCrypto("USDT");
    setTicker("USDT");
    setNetwork(usdtNetwork);

    const { crypto, ticker } = usePaymentStore.getState();
    isRequest
      ? displayEnterPhone()
      : displayHowToEstimation({ crypto, ticker });
    isRequest ? next({ stepId: "enterPhone" }) : next({ stepId: "payOptions" });
  } else {
    addMessages([
      {
        type: "incoming",
        content:
          "Invalid choice. Choose your prefered network or say Hi if you are stock.",
        timestamp: new Date(),
      },
    ]);
  }
};
