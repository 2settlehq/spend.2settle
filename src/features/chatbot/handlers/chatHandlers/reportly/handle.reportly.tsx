import {
  countWords,
  getLastReportId,
  getNextReportID,
  isValidWalletAddress,
  makeAReport,
} from "@/helpers/api_call/reportly_page_calls";
import { formatPhoneNumber, phoneNumberPattern } from "@/utils/utilities";
import useChatStore from "stores/chatStore";
import { useReportlyStore } from "stores/reportlyStore";
import { greetings } from "../../../helpers/ChatbotConsts";
import { helloMenu } from "../hello.menu";
import {
  displayReportlyFarwell,
  displayReportlyFraudsterWalletAddress,
  displayReportlyName,
  displayReportlyNote,
  displayReportlyPhoneNumber,
  displayReportlyReporterWalletAddress,
  displayReportlyWelcome,
} from "../menus/reportly/reportly.welcome";

// makeReport step: user picks report type (1/2/3)
export const handleMakeReport = (chatInput: string) => {
  const { next, prev, addMessages } = useChatStore.getState();
  const { setReportType } = useReportlyStore.getState();

  if (
    greetings.includes(chatInput.trim().toLowerCase()) ||
    chatInput.trim() === "00"
  ) {
    helloMenu("hi");
  } else if (chatInput.trim() === "0") {
    prev();
  } else if (chatInput === "1") {
    setReportType("Track Transaction");
    displayReportlyName();
    next({ stepId: "reporterName" });
  } else if (chatInput === "2") {
    setReportType("Stolen funds | disappear funds");
    displayReportlyName();
    next({ stepId: "reporterName" });
  } else if (chatInput === "3") {
    setReportType("Fraud");
    displayReportlyName();
    next({ stepId: "reporterName" });
  } else {
    addMessages([
      {
        type: "incoming",
        content: "Invalid choice. You need to choose an action from the options",
        timestamp: new Date(),
      },
    ]);
  }
};

// reporterName step: user types their full name
export const handleReporterName = (chatInput: string) => {
  const { next, prev, addMessages } = useChatStore.getState();
  const { setReporterName } = useReportlyStore.getState();

  if (
    greetings.includes(chatInput.trim().toLowerCase()) ||
    chatInput.trim() === "00"
  ) {
    helloMenu("hi");
  } else if (chatInput.trim() === "0") {
    prev();
    displayReportlyWelcome();
  } else {
    const name = chatInput.trim();
    if (!name) {
      addMessages([
        {
          type: "incoming",
          content: (
            <span>Please enter your name. You cannot submit an empty value.</span>
          ),
          timestamp: new Date(),
        },
      ]);
      return;
    }
    setReporterName(name);
    displayReportlyPhoneNumber();
    next({ stepId: "reporterPhoneNumber" });
  }
};

// reporterPhoneNumber step: user types their phone number
export const handleReporterPhoneNumber = (chatInput: string) => {
  const { next, prev, addMessages } = useChatStore.getState();
  const { setReporterPhoneNumber } = useReportlyStore.getState();

  if (
    greetings.includes(chatInput.trim().toLowerCase()) ||
    chatInput.trim() === "00"
  ) {
    helloMenu("hi");
  } else if (chatInput.trim() === "0") {
    prev();
    displayReportlyName();
  } else {
    const phoneNumber = chatInput.trim();
    if (!phoneNumberPattern.test(phoneNumber)) {
      addMessages([
        {
          type: "incoming",
          content: (
            <span>
              Please enter a valid phone number. <b>{phoneNumber}</b> is not
              valid.
            </span>
          ),
          timestamp: new Date(),
        },
      ]);
      return;
    }
    setReporterPhoneNumber(phoneNumber);
    displayReportlyReporterWalletAddress();
    next({ stepId: "reporterWallet" });
  }
};

// reporterWallet step: user types their own wallet address + report ID is generated
export const handleReporterWalletAddress = async (chatInput: string) => {
  const { next, prev, addMessages } = useChatStore.getState();
  const { setReporterWalletAddress, setReportId } =
    useReportlyStore.getState();

  if (
    greetings.includes(chatInput.trim().toLowerCase()) ||
    chatInput.trim() === "00"
  ) {
    helloMenu("hi");
  } else if (chatInput.trim() === "0") {
    prev();
    displayReportlyPhoneNumber();
  } else {
    const wallet = chatInput.trim();
    if (!isValidWalletAddress(wallet)) {
      addMessages([
        {
          type: "incoming",
          content: (
            <span>
              Please enter a valid wallet address. <b>{wallet}</b> is not valid.
            </span>
          ),
          timestamp: new Date(),
        },
      ]);
      return;
    }
    setReporterWalletAddress(wallet);
    try {
      const lastId = await getLastReportId();
      setReportId(`Report_${getNextReportID(lastId)}`);
    } catch (e) {
      console.error("Failed to generate report ID:", e);
    }
    displayReportlyFraudsterWalletAddress();
    next({ stepId: "fraudsterWallet" });
  }
};

// fraudsterWallet step: user enters fraudster wallet or skips with "1"
export const handleFraudsterWalletAddress = (chatInput: string) => {
  const { next, prev, addMessages } = useChatStore.getState();
  const { setFraudsterWalletAddress } = useReportlyStore.getState();

  if (
    greetings.includes(chatInput.trim().toLowerCase()) ||
    chatInput.trim() === "00"
  ) {
    helloMenu("hi");
  } else if (chatInput.trim() === "0") {
    prev();
    displayReportlyReporterWalletAddress();
  } else if (chatInput.trim() === "1") {
    setFraudsterWalletAddress("");
    displayReportlyNote();
    next({ stepId: "reportlyNote" });
  } else {
    const wallet = chatInput.trim();
    if (!isValidWalletAddress(wallet)) {
      addMessages([
        {
          type: "incoming",
          content: (
            <span>
              Please enter a valid wallet address. <b>{wallet}</b> is not valid.
            </span>
          ),
          timestamp: new Date(),
        },
      ]);
      return;
    }
    setFraudsterWalletAddress(wallet);
    displayReportlyNote();
    next({ stepId: "reportlyNote" });
  }
};

// reportlyNote step: user describes what happened, then report is submitted
export const handleReportlyNote = async (chatInput: string) => {
  const { prev, addMessages, setLoading } = useChatStore.getState();
  const {
    reportType,
    reporterName,
    reporterPhoneNumber,
    reporterWalletAddress,
    fraudsterWalletAddress,
    reportId,
    setDescriptionNote,
    reset,
  } = useReportlyStore.getState();

  if (
    greetings.includes(chatInput.trim().toLowerCase()) ||
    chatInput.trim() === "00"
  ) {
    helloMenu("hi");
  } else if (chatInput.trim() === "0") {
    prev();
    displayReportlyFraudsterWalletAddress();
  } else {
    const note = chatInput.trim();
    const wordCount = countWords(note);
    if (wordCount > 100) {
      addMessages([
        {
          type: "incoming",
          content: (
            <span>
              Please keep your note within 100 words. Yours is {wordCount}{" "}
              words.
            </span>
          ),
          timestamp: new Date(),
        },
      ]);
      return;
    }
    setDescriptionNote(note);
    setLoading(true);
    try {
      await makeAReport({
        name: reporterName,
        phone_Number: formatPhoneNumber(reporterPhoneNumber),
        wallet_address: reporterWalletAddress,
        fraudster_wallet_address: fraudsterWalletAddress,
        description: note,
        complaint: reportType,
        status: "pending",
        report_id: reportId,
        confirmer: "",
      });
      reset();
      displayReportlyFarwell();
      helloMenu("hi");
    } catch (error) {
      console.error("Report submission failed:", error);
      addMessages([
        {
          type: "incoming",
          content: (
            <span>
              There was an issue saving the report.
              <br />
              Please check your internet and try again, or say &apos;hi&apos;
              to start over.
            </span>
          ),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }
};
