import useChatStore, { MessageType } from "stores/chatStore";

export const displayReportlyWelcome = async () => {
  const { addMessages } = useChatStore.getState();

  const newMessages: MessageType[] = [
    {
      type: "incoming",
      content: (
        <span>
          Here is your menu:
          <br />
          <br />
          1. Track Transaction
          <br />
          2. Stolen funds | disappear funds
          <br />
          3. Fraud
          <br />
          0. Go back
        </span>
      ),
      timestamp: new Date(),
    },
  ];
  addMessages(newMessages);
};

export const displayReportlyName = () => {
  const { addMessages } = useChatStore.getState();
  addMessages([
    {
      type: "incoming",
      content: (
        <span>
          Please enter your full name
          <br />
          00. Exit
        </span>
      ),
      timestamp: new Date(),
    },
  ]);
};

export const displayReportlyPhoneNumber = () => {
  const { addMessages } = useChatStore.getState();
  addMessages([
    {
      type: "incoming",
      content: (
        <span>
          Please enter your phone number
          <br />
          0. Go back
          <br />
          00. Exit
        </span>
      ),
      timestamp: new Date(),
    },
  ]);
};

export const displayReportlyReporterWalletAddress = () => {
  const { addMessages } = useChatStore.getState();
  addMessages([
    {
      type: "incoming",
      content: (
        <span>
          Please enter your wallet address
          <br />
          0. Go back
          <br />
          00. Exit
        </span>
      ),
      timestamp: new Date(),
    },
  ]);
};

export const displayReportlyFraudsterWalletAddress = () => {
  const { addMessages } = useChatStore.getState();
  addMessages([
    {
      type: "incoming",
      content: (
        <span>
          Please enter the fraudster wallet address (optional)
          <br />
          1. Skip
          <br />
          0. Go back
          <br />
          00. Exit
        </span>
      ),
      timestamp: new Date(),
    },
  ]);
};

export const displayReportlyNote = () => {
  const { addMessages } = useChatStore.getState();
  addMessages([
    {
      type: "incoming",
      content: (
        <span>
          Explain what happened in less than 100 words
          <br />
          0. Go back
          <br />
          00. Exit
        </span>
      ),
      timestamp: new Date(),
    },
  ]);
};

export const displayReportlyFarwell = () => {
  const { addMessages } = useChatStore.getState();
  addMessages([
    {
      type: "incoming",
      content: (
        <span>
          Thank you for submitting the report.
          <br />
          We will get back to you shortly.
        </span>
      ),
      timestamp: new Date(),
    },
  ]);
};
