import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { playReplyMessageSound, playSentMessageSound } = vi.hoisted(() => ({
  playReplyMessageSound: vi.fn(),
  playSentMessageSound: vi.fn(),
}));

vi.mock("@/utils/chatSounds", () => ({
  playReplyMessageSound,
  playSentMessageSound,
}));

import useChatStore from "stores/chatStore";

beforeEach(() => {
  playReplyMessageSound.mockClear();
  playSentMessageSound.mockClear();
  useChatStore.setState({ messages: [], serialized: [] } as any);
});

describe("chat message sounds", () => {
  it("plays the sent sound once when a user message is added", () => {
    useChatStore.getState().addMessages([
      {
        type: "outgoing",
        content: <span>Hello</span>,
        timestamp: new Date(),
      },
    ]);

    expect(playSentMessageSound).toHaveBeenCalledTimes(1);
    expect(playReplyMessageSound).not.toHaveBeenCalled();
  });

  it("plays one reply sound for an AI response containing multiple messages", () => {
    useChatStore.getState().addMessages([
      {
        type: "incoming",
        content: <span>Your transaction is ready.</span>,
        timestamp: new Date(),
      },
      {
        type: "incoming",
        content: <span>Complete the details below.</span>,
        timestamp: new Date(),
      },
    ]);

    expect(playReplyMessageSound).toHaveBeenCalledTimes(1);
    expect(playSentMessageSound).not.toHaveBeenCalled();
  });
});
