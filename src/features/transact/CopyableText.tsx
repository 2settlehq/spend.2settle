import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useChatStore from "stores/chatStore";
import { useStatusStore } from "stores/statusStore";

const TERMINAL_STATUSES = ["settled", "failed", "settlement_reversed"];
function toTimeMs(value?: Date | string | number | null): number | undefined {
  if (!value) return undefined;

  const timeMs = value instanceof Date ? value.getTime() : new Date(value).getTime();

  return Number.isFinite(timeMs) ? timeMs : undefined;
}

export const CopyableText: React.FC<{
  text: string;
  label: string;
  reference?: string;
  isWallet?: boolean;
  paymentType?: string;
  lastAssignedTime?: Date | string | number;
}> = ({
  text,
  label,
  reference,
  isWallet = false,
  paymentType,
  lastAssignedTime,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [shouldShowDialog, setShouldShowDialog] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const statusPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const statusPollReferenceRef = useRef<string | null>(null);
  const statusRecord = useStatusStore((state) =>
    reference ? state.statusesByReference[reference] : undefined,
  );
  const patchStatus = useStatusStore((state) => state.patchStatus);
  const currentStatus = statusRecord?.status ?? "pending";
  const isCreateGift =
    paymentType?.toLowerCase() === "gift" ||
    statusRecord?.type?.toLowerCase() === "gift";
  const effectiveAssignedTimeMs =
    statusRecord?.expiresAt && isWallet
      ? toTimeMs(statusRecord.expiresAt)
      : toTimeMs(lastAssignedTime);
  const effectiveAssignedTime =
    typeof effectiveAssignedTimeMs === "number"
      ? new Date(effectiveAssignedTimeMs)
      : undefined;
  const hasWalletExpired = useCallback(() => {
    return typeof effectiveAssignedTimeMs === "number"
      ? effectiveAssignedTimeMs <= Date.now()
      : false;
  }, [effectiveAssignedTimeMs]);
  const clearStatusPoll = useCallback(() => {
    if (statusPollIntervalRef.current) {
      clearInterval(statusPollIntervalRef.current);
      statusPollIntervalRef.current = null;
      statusPollReferenceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isWallet && effectiveAssignedTime && currentStatus === "pending") {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const distance =
          effectiveAssignedTime instanceof Date
            ? effectiveAssignedTime.getTime() - now
            : 0;

        if (distance < 0) {
          clearInterval(timer);
          setTimeLeft("00:00");
          setIsExpired(true);
          if (!walletCopied && shouldShowDialog) {
            setDialogMessage(
              "This wallet is no longer available. Please start a new transaction.",
            );
            setIsDialogOpen(true);
          }
        } else {
          const minutes = Math.floor(
            (distance % (1000 * 60 * 60)) / (1000 * 60),
          );
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          const timeString = `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`;
          setTimeLeft(timeString);

          // Enable dialog when we get within the last 2 minutes
          if (minutes < 2 || (minutes === 2 && seconds === 0)) {
            setShouldShowDialog(true);
          }

          // Show dialog at exactly 2 minutes if wallet was copied
          if (
            minutes === 2 &&
            seconds === 0 &&
            walletCopied &&
            shouldShowDialog
          ) {
            setDialogMessage("Have you sent the payment?");
            setIsDialogOpen(true);
          }
        }
      }, 10000);

      return () => clearInterval(timer);
    }
  }, [
    isWallet,
    effectiveAssignedTime,
    currentStatus,
    walletCopied,
    shouldShowDialog,
  ]);

  useEffect(() => {
    if (!isWallet) return;

    if (hasWalletExpired()) {
      setIsExpired(true);
      setTimeLeft("00:00");
      setIsDialogOpen(false);
      return;
    }

    if (currentStatus !== "pending") {
      setIsDialogOpen(false);
      setShouldShowDialog(false);
    }
  }, [isWallet, currentStatus, hasWalletExpired]);

  useEffect(() => {
    if (
      !isWallet ||
      !reference ||
      isCreateGift ||
      hasWalletExpired() ||
      TERMINAL_STATUSES.includes(currentStatus)
    ) {
      clearStatusPoll();
      return;
    }

    if (
      statusPollIntervalRef.current &&
      statusPollReferenceRef.current === reference
    ) {
      return;
    }

    clearStatusPoll();

    let cancelled = false;

    const fetchStatus = async () => {
      if (hasWalletExpired()) {
        cancelled = true;
        setIsExpired(true);
        setTimeLeft("00:00");
        clearStatusPoll();
        return;
      }

      try {
        const res = await fetch(
          `/api/payments/status?reference=${encodeURIComponent(reference)}`,
        );
        if (!res.ok) return;

        const data = await res.json();
        if (!data?.ok || !data?.payment || cancelled) return;

        patchStatus(reference, {
          status: data.payment.status,
          type: data.payment.type,
          txHash: data.payment.txHash,
          confirmations: data.payment.confirmations,
          expiresAt: data.payment.expiresAt,
        });
      } catch (error) {
        console.error("Failed to fetch live payment status:", error);
      }
    };

    void fetchStatus();

    statusPollReferenceRef.current = reference;
    statusPollIntervalRef.current = setInterval(() => {
      void fetchStatus();
    }, 10000);

    return () => {
      cancelled = true;
      clearStatusPoll();
    };
  }, [
    isWallet,
    reference,
    patchStatus,
    currentStatus,
    isCreateGift,
    hasWalletExpired,
    clearStatusPoll,
  ]);

  const getWalletStatusText = () => {
    switch (currentStatus) {
      case "pending":
        return isExpired ? "Wallet expired" : timeLeft;
      case "confirming":
        return "Confirming";
      case "confirmed":
        return "Confirmed";
      case "settling":
        return "Settling";
      case "settled":
        return "Settled";
      case "expired":
        return "Wallet expired";
      case "failed":
        return "Failed";
      case "settlement_reversed":
        return "Reversed";
      default:
        return timeLeft;
    }
  };

  const getWalletStatusClassName = () => {
    switch (currentStatus) {
      case "pending":
        return timeLeft < "02:01" || isExpired
          ? "text-red-500 animate-pulse font-bold"
          : "text-green-500";
      case "confirming":
      case "confirmed":
      case "settling":
        return "text-blue-600 font-bold";
      case "settled":
        return "text-green-600 font-bold";
      case "expired":
      case "failed":
      case "settlement_reversed":
        return "text-red-500 font-bold";
      default:
        return "text-green-500";
    }
  };

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
      if (isWallet) {
        setWalletCopied(true);
      }
    });
  }, [text, isWallet]);

  const handleConfirm = useCallback(() => {
    setIsDialogOpen(false);
    setShouldShowDialog(false);
    const { addMessages, next } = useChatStore.getState();
    addMessages([
      {
        type: "incoming",
        content: (
          <span>
            Thank you for your transaction, <br />
            Wait a little while and check if you have received your funds.
            <br />
            <br />
            1. Start another transaction
            <br />
            2. No, I want to complain
          </span>
        ),
        timestamp: new Date(),
      },
    ]);
    next({ stepId: "paymentProcessing" });
  }, []);

  const handleClose = useCallback(() => {
    setIsDialogOpen(false);
    setShouldShowDialog(false);
    const { addMessages, next } = useChatStore.getState();
    addMessages([
      {
        type: "incoming",
        content: (
          <span>
            It appears you did not go through with the transaction again, <br />
            Thanks anyway for your time. Feel free to
            <br />
            <br />
            1. Start another transaction
            <br />
            2. Tell us what went wrong
          </span>
        ),
        timestamp: new Date(),
      },
    ]);
    next({ stepId: "paymentProcessing" });
  }, []);

  const truncateText = useMemo(
    () => (text: string) => {
      return text.length > 7 ? `${text.slice(0, 6)}...${text.slice(-4)}` : text;
    },
    [],
  );

  const getButtonText = () => {
    if (dialogMessage === "Have you sent the payment?") {
      return "Yes, I've sent the payment";
    } else if (
      dialogMessage ===
      "This wallet is no longer available. Please start a new transaction."
    ) {
      return "Start a new transaction";
    } else {
      return "Okay, I understand";
    }
  };

  return (
    <div className="flex flex-col items-start space-y-2">
      {isWallet ? <span>{truncateText(text)}</span> : ""}

      <Button
        ref={buttonRef}
        onClick={handleCopy}
        variant="outline"
        size="sm"
        disabled={isWallet && isExpired}
      >
        {!isCopied ? (
          <>
            <Copy className="w-4 h-4 mr-2" />
            <span>Copy {label}</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            <span>{label} Copied</span>
          </>
        )}
      </Button>
      {isWallet && (
        <span className={getWalletStatusClassName()}>
          {getWalletStatusText()}
        </span>
      )}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            buttonRef.current?.focus();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Confirmation</DialogTitle>
            <DialogDescription>{dialogMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md shadow-lg transition-all duration-300 ease-in-out hover:bg-blue-700"
              onClick={() => {
                if (walletCopied) {
                  handleConfirm();
                } else {
                  handleClose();
                }
              }}
            >
              {getButtonText()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
