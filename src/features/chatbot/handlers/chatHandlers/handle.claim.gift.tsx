import { isGiftValid } from "@/services/transactionService/giftService/giftService";
import useChatStore from "stores/chatStore";
import { displaySearchBank } from "./menus/display.bank.search";
import { useTransactionStore } from "stores/transactionStore";
import { normalizeGiftId } from "@/services/gift-flow";

export const handleClaimGift = async (chatInput: string) => {
  const setGiftId = useTransactionStore.getState().setGiftId;
  const { next, addMessages } = useChatStore.getState();

  let giftId: string;
  try {
    giftId = normalizeGiftId(chatInput);
  } catch (error) {
    addMessages([{ type: "incoming", content: (error as Error).message, timestamp: new Date() }]);
    return;
  }
  setGiftId(giftId);

  const result = await isGiftValid(giftId);

  if (!result.exists || !result.user) {
    addMessages([
      {
        type: "incoming",
        content: (
          <span>
            I can not find this gift,
            <br />
            Please check the giftId
            <br />
            and be sure you are entering it correctly,
          </span>
        ),
        timestamp: new Date(),
      },
    ]);
    return;
  }

  const { status } = result.user;
  const normalizedStatus = status?.toLowerCase();

  if (normalizedStatus === "confirmed") {
    // Gift has been paid — proceed to collect bank details
    displaySearchBank();
    next({ stepId: "enterBankSearchWord" });
  } else if (normalizedStatus === "settled") {
    addMessages([
      {
        type: "incoming",
        content: "This gift has already been claimed.",
        timestamp: new Date(),
      },
    ]);
  } else if (normalizedStatus === "pending" || normalizedStatus === "awaiting_payment") {
    addMessages([
      {
        type: "incoming",
        content:
          "The sender has not completed the transaction yet. Please try again later.",
        timestamp: new Date(),
      },
    ]);
  } else {
    addMessages([
      {
        type: "incoming",
        content:
          "This gift cannot be claimed because the payment was not completed.",
        timestamp: new Date(),
      },
    ]);
  }
};
