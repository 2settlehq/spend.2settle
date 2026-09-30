import { getBaseSymbol } from "@/utils/utilities";
import useChatStore from "stores/chatStore";
import { usePaymentStore } from "stores/paymentStore";
import { greetings } from "../../helpers/ChatbotConsts";
import { helloMenu } from "./hello.menu";
import { displayHowToEstimation } from "./menus/how.to.estimate";
import { displayNetwork } from "./menus/display.network";
import { displayEnterPhone } from "./menus/display.phone";
import { getWalletNetworkError } from "@/lib/wallets/walletNetworks";

export const handleTransactCrypto = async (chatInput: string) => {
  const { next, addMessages } = useChatStore.getState();
  const {
    paymentMode,
    setCrypto,
    setTicker,
    setNetwork,
  } = usePaymentStore.getState();

  // Blocks assets the connected wallet can't be debited for
  const rejectForWallet = (networks: string[]) => {
    const error = getWalletNetworkError(networks);
    if (!error) return false;
    addMessages([{ type: "incoming", content: error, timestamp: new Date() }]);
    return true;
  };

  const isRequest = paymentMode.toLowerCase() === "payrequest";

  if (greetings.includes(chatInput.trim().toLowerCase())) {
    helloMenu(chatInput);
  } else if (chatInput === "00") {
    helloMenu("hi");
  } else if (chatInput === "0") {
    helloMenu("hi");
  } else if (chatInput === "1") {
    if (rejectForWallet(["btc"])) return;

    setCrypto("BTC");
    setTicker("BTCUSDT");
    setNetwork("BTC");

    const crypto = usePaymentStore.getState().crypto;
    const ticker = usePaymentStore.getState().ticker;

    isRequest ? displayEnterPhone() : displayHowToEstimation({ crypto, ticker });
    isRequest ? next({ stepId: "enterPhone" }) : next({ stepId: "payOptions" });
  } else if (chatInput === "2") {
    if (rejectForWallet(["eth"])) return;

    setCrypto("ETH");
    setTicker("ETHUSDT");
    setNetwork("ETH");

    const crypto = usePaymentStore.getState().crypto;
    const ticker = usePaymentStore.getState().ticker;

    isRequest ? next({ stepId: "enterPhone" }) : next({ stepId: "payOptions" });
    isRequest ? displayEnterPhone() : displayHowToEstimation({ crypto, ticker });
  }
  // else if (chatInput === "3") {
  //   if (walletIsConnected && walletType !== "EVM") {
  //     addMessages([
  //       {
  //         type: "incoming",
  //         content: `BNB is only supported when BNB/ETH wallet is connected. \n Please select the asset of the wallet connected`,
  //         timestamp: new Date(),
  //       },
  //     ]);
  //     return;
  //   }

  //   setCrypto("BNB");
  //   setTicker("BNBUSDT");
  //   setNetwork("BNB");

  //   const crypto = usePaymentStore.getState().crypto;
  //   const ticker = usePaymentStore.getState().ticker;

  //   isRequest ? displayEnterPhone() : displayHowToEstimation({ crypto, ticker });
  //   isRequest ? next({ stepId: "enterPhone" }) : next({ stepId: "payOptions" });
  // }
  else if (chatInput === "3") {
    if (rejectForWallet(["trx"])) return;

    setCrypto("TRX");
    setTicker("TRXUSDT");
    setNetwork("TRX");

    const crypto = getBaseSymbol(usePaymentStore.getState().crypto);
    const ticker = getBaseSymbol(usePaymentStore.getState().ticker);

    isRequest ? displayEnterPhone() : displayHowToEstimation({ crypto, ticker });
    isRequest ? next({ stepId: "enterPhone" }) : next({ stepId: "payOptions" });
  } else if (chatInput === "4") {
    if (rejectForWallet(["erc20", "bep20", "trc20"])) return;
    displayNetwork();
    next({ stepId: "network" });
  } else {
    addMessages([
      {
        type: "incoming",
        content: "Invalid choice. Say 'Hi' or 'Hello' to start over!",
        timestamp: new Date(),
      },
    ]);
  }
};
