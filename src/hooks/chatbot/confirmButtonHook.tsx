import { Button } from "@/components/ui/button";
import { processTransaction } from "@/core/process_transaction/process_transction_helpers";
import ConfirmDialog from "@/features/transact/confirmButton/ConfirmDialog";
import WalletInfo from "@/features/transact/confirmButton/WalletInfo";
import { CountdownTimer } from "@/helpers/format_date";
import { getAvaialableWallet } from "@/services/crypto/wallet";
import { CheckCircle } from "lucide-react";
import React, { useEffect, useRef } from "react";
import useChatStore from "stores/chatStore";
import { usePaymentStore } from "stores/paymentStore";
import { useConfirmDialogStore } from "stores/useConfirmDialogStore";
import { useWalletStore } from "@/hooks/wallet/useWalletStore";
import {
  isWalletConnectedForNetwork,
  useBlockchainPayment,
} from "./useConfirmAndProceedState";

const ConfirmAndProceedButton = () => {
  const loading = useChatStore((s) => s.loading);
  const setLoading = useChatStore((s) => s.setLoading);
  const currentStep = useChatStore((s) => s.currentStep);

  const { network, paymentMode } = usePaymentStore();
  const activeWallet = usePaymentStore((s) => s.activeWallet);
  const walletLastAssignedTime = usePaymentStore(
    (s) => s.walletLastAssignedTime,
  );

  // Check if user is claiming a gift - skip confirmation dialog
  const isClaimingGift = paymentMode?.toLowerCase().trim() === "claim gift";

  const hasCopyButtonBeenClicked = useConfirmDialogStore(
    (s) => s.hasCopyButtonBeenClicked,
  );
  const setHasCopyButtonBeenClicked = useConfirmDialogStore(
    (s) => s.setHasCopyButtonBeenClicked,
  );
  const openConfirmDialog = useConfirmDialogStore((s) => s.open);
  const closeConfirmDialog = useConfirmDialogStore((s) => s.close);
  const walletIsExpired = useConfirmDialogStore((s) => s.walletIsExpired);
  const walletFetchError = useConfirmDialogStore((s) => s.walletFetchError);
  const setWalletFetchError = useConfirmDialogStore(
    (s) => s.setWalletFetchError,
  );

  const hasOpenedRef = useRef(false);
  const SHOULD_OPEN_STEP = "sendPayment";

  // Use unified wallet store for connection state
  const { walletType } = useWalletStore();
  const connectedWallet = isWalletConnectedForNetwork();

  // Get blockchain payment hook for direct wallet debiting
  const { executePayment } = useBlockchainPayment();

  /**
   * Handle blockchain payment - directly debit user's connected wallet
   */
  const handleBlockchainPayment = async () => {
    console.log("handleBlockchainPayment: Directly debiting user wallet");
    try {
      setLoading(true);
      setWalletFetchError("");

      const result = await executePayment();

      if (!result.success) {
        console.error("Blockchain payment failed:", result.error);
        setWalletFetchError(result.error || "Payment failed");
      } else {
        console.log("Blockchain payment successful");
        setHasCopyButtonBeenClicked(true);
      }
    } catch (err) {
      console.error("Error in handleBlockchainPayment:", err);
      setWalletFetchError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle manual payment - user copies wallet and sends manually
   */
  const handleManualPayment = async () => {
    try {
      setLoading(true);
      await processTransaction();
    } catch (err) {
      console.error("Error in handleManualPayment:", err);
      setWalletFetchError(
        err instanceof Error ? err.message : "An error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Main confirm handler - routes to appropriate payment method
   */
  const handleConfirm = async () => {
    console.log(
      "handleConfirm: connectedWallet =",
      connectedWallet,
      "walletType =",
      walletType,
    );

    if (connectedWallet) {
      // Wallet is connected for this network - directly debit
      await handleBlockchainPayment();
    } else {
      // No wallet connected - manual transfer flow
      await handleManualPayment();
    }
  };

  const isExpired = walletIsExpired;

  const isCopyButtonDisabled = hasCopyButtonBeenClicked || isExpired;

  // Dynamic dialog description based on wallet connection
  const getDialogDescription = () => {
    if (connectedWallet) {
      return (
        <span>
          You are paying directly from your <b>{network?.toUpperCase()}</b>{" "}
          wallet.
          <br />
          Please confirm to proceed with the transaction.
        </span>
      );
    }
    return (
      <span>
        Make sure you complete the transfer within <b>30 mins</b>
      </span>
    );
  };

  useEffect(() => {
    // do not run if the user is not have already copied wallet
    if (hasCopyButtonBeenClicked) return;
    if (activeWallet) return;
    // dont run if the user is not going to make payment in the next step
    if (currentStep.stepId !== SHOULD_OPEN_STEP) return; // make sure we pop up only when we have not send payment
    // do not open the dialog if the dialog is already opened
    if (hasOpenedRef.current) return;
    hasOpenedRef.current = true;

    // Skip dialog for claim gift - proceed directly
    if (isClaimingGift) {
      handleConfirm();
      return;
    }

    openConfirmDialog({
      title: "Please Note",
      description: getDialogDescription(),
      onConfirm: async () => {
        handleConfirm();
      },
    });
  }, [openConfirmDialog, closeConfirmDialog, connectedWallet, activeWallet, isClaimingGift]);

  const handleCopyWallet = async (wallet: string) => {
    try {
      await navigator.clipboard.writeText(wallet);

      // global state (business logic)
      setHasCopyButtonBeenClicked(true);
    } catch (err) {
      console.error("Failed to copy wallet:", err);
    }
  };

  const truncateWallet = (wallet: string) => {
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  const showCountdown = !!activeWallet && !isExpired;

  const showExpired = isExpired;
  // walletLastAssignedTime stores the engine's expiresAt directly
  const expiryTime = walletLastAssignedTime
    ? new Date(walletLastAssignedTime)
    : new Date(Date.now() + 30 * 60 * 1000);

  return (
    <div className="flex flex-col items-center space-y-4">
      <ConfirmDialog />
      <Button
        disabled={(!hasCopyButtonBeenClicked || !!activeWallet) && !walletFetchError}
        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md shadow-lg transition-all duration-300 ease-in-out min-w-[200px] hover:bg-blue-700 hover:text-white"
        variant="outline"
        onClick={() => {
          // Skip dialog for claim gift - proceed directly
          if (isClaimingGift) {
            handleConfirm();
            return;
          }
          openConfirmDialog({
            title: "Please Note",
            description: getDialogDescription(),
            onConfirm: async () => {
              handleConfirm();
            },
          });
        }}
      >
        {loading ? (
          connectedWallet ? (
            "Processing payment..."
          ) : (
            "Generating wallet for you..."
          )
        ) : hasCopyButtonBeenClicked ? (
          <span>
            Completed <CheckCircle className="ml-2 h-4 w-4" />{" "}
          </span>
        ) : connectedWallet ? (
          "Pay Now"
        ) : (
          "Confirm & Proceed"
        )}
      </Button>

      {/* error state */}
      {walletFetchError && (
        <p className="text-xs text-red-500">{walletFetchError}</p>
      )}

      {/* copiable wallet - only show for manual payment flow */}
      {activeWallet && !connectedWallet && (
        <WalletInfo
          wallet={activeWallet}
          network={network!}
          isCopyDisabled={isCopyButtonDisabled}
          onCopy={() => handleCopyWallet(activeWallet ?? "")}
          truncateWallet={truncateWallet}
        />
      )}
      {/* count down - only show for manual payment flow */}
      {showCountdown && !connectedWallet && (
        <p role="status" className="text-xs text-muted-foreground">
          Address expires in <CountdownTimer expiryTime={expiryTime} />
          {showExpired && "This wallet has expired"}
        </p>
      )}
    </div>
  );
};

export default ConfirmAndProceedButton;

// export interface ConfirmAndProceedButtonProps {
//   phoneNumber: string;
//   setLoading: React.Dispatch<React.SetStateAction<boolean>>;
//   sharedPaymentMode: string;
//   processTransaction: (
//     phoneNumber: string,
//     isRetry: boolean,
//     isGiftTrx: boolean,
//     requestPayment: boolean,
//     activeWallet: string,
//     assignedTime?: Date,
//   ) => Promise<void>;
//   network: string;
//   connectedWallet: boolean;
//   amount: string;
// }

// const ConfirmAndProceedButton: React.FC<ConfirmAndProceedButtonProps> = (
//   {
//     // phoneNumber,
//     // // setLoading,
//     // sharedPaymentMode,
//     // processTransaction,
//     // network,
//     // connectedWallet,
//     // amount,
//   },
// ) => {
//   const { setLoading } = useChatStore.getState();
//   // const {
//   //   state,
//   //   setState,
//   //   handleBlockchainPayment,
//   //   handleCopyWallet,
//   //   truncateWallet,
//   // } = useConfirmAndProceedState({
//   //   phoneNumber,
//   //   setLoading,
//   //   sharedPaymentMode,
//   //   processTransaction,
//   //   network,
//   //   connectedWallet,
//   //   amount,
//   // });

//   // const handleConfirmCallback = useCallback(() => {
//   //   handleConfirm({
//   //     setState,
//   //     phoneNumber,
//   //     setLoading,
//   //     sharedPaymentMode,
//   //     processTransaction,
//   //     network,
//   //   });
//   // }, [
//   //   setState,
//   //   phoneNumber,
//   //   setLoading,
//   //   sharedPaymentMode,
//   //   processTransaction,
//   //   network,
//   // ]);

//   // const isCopyButtonDisabled =
//   //   state.hasCopyButtonBeenClicked || state.isExpired;
//   console.log("render call");

//   return (
//     <div className=" flex flex-col items-center space-y-4">
//       {/* dialog  */}
//       <ConfirmDialog
//       // isOpen={true}
//       // // {state.isDialogOpen}
//       // title={"Please Note"}
//       // description={
//       //   // connectedWallet ? (
//       //   //   `You are paying directly from your ${network.toUpperCase()} wallet`
//       //   // ) : (
//       //   <span>
//       //     Make sure you complete the transfer within <b>5 mins</b>
//       //   </span>
//       //   // )
//       // }
//       // onClose={
//       //   () => console.log("Closing dialog")
//       //   // setState((prev) => ({ ...prev, isDialogOpen: false }))
//       // }
//       // onConfirm={
//       //   () => console.log("Button clicked")
//       //   // connectedWallet ? handleBlockchainPayment() : handleConfirmCallback()
//       // }
//       />

//       {/* button  */}
//       <Button
//         className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md shadow-lg transition-all duration-300 ease-in-out min-w-[200px] hover:bg-blue-700"
//         // disabled={state.isButtonClicked}
//         // aria-busy={state.isProcessing}
//         // onClick={() => {
//         //   if (!state.isDialogOpen) {
//         //     setState((prev) => ({ ...prev, isDialogOpen: true }));
//         //   }
//         // }}
//       >
//         {
//           //   state.isProcessing ? (
//           //   "Generating wallet for you..."
//           // ) : state.isButtonClicked ? (
//           //   <span>
//           //     Completed <CheckCircle className="ml-2 h-4 w-4" />{" "}
//           //   </span>
//           // ) : (
//           "Confirm & Proceed"
//           // )
//         }
//       </Button>

//       {/* error state */}
//       {/* {state.error && <p className="text-red-500">{state.error}</p>} */}

//       {/* copiable wallet */}
//       {/* {state.activeWallet && (
//         <WalletInfo
//           wallet={state.activeWallet}
//           network={network}
//           isCopyDisabled={isCopyButtonDisabled}
//           onCopy={() => handleCopyWallet(state.activeWallet ?? "")}
//           truncateWallet={truncateWallet}
//         />
//       )} */}

//       {/* count down */}
//       {/* <p role="status" className="text-sm text-muted-foreground">
//         {state.isButtonClicked &&
//           state.lastAssignedTime &&
//           !state.isExpired && (
//             <>
//               This wallet Expires in{" "}
//               <CountdownTimer
//                 expiryTime={
//                   new Date(state.lastAssignedTime.getTime() + 5 * 60 * 1000)
//                 }
//               />{" "}
//             </>
//           )}
//         {state.isExpired && "This wallet has expired"}
//       </p> */}
//     </div>
//   );
// };

// export default ConfirmAndProceedButton;
