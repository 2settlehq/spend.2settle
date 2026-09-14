import React, { act, createRef } from "react";
import { createRoot, Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChatInput from "@/components/chatbot/ChatInput";
import ChatMessageItem from "@/components/chatbot/ChatMessageItem";

vi.mock("@mui/icons-material/Send", () => ({ default: () => <span /> }));
vi.mock("next/image", () => ({ default: (props: any) => <img {...props} /> }));
vi.mock("@/utils/renderMessageContent", () => ({
  renderMessageContent: (msg: any) => msg.content ?? <div>Transfer form</div>,
}));

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Chat composer", () => {
  const renderInput = (value: string, onSubmit = vi.fn(), loading = false) => {
    act(() => root.render(<ChatInput textareaRef={createRef()} chatInput={value} onChange={() => {}} onSubmit={onSubmit} loading={loading} />));
    return onSubmit;
  };

  it("does not send blank messages or submit while a reply is loading", () => {
    const submit = renderInput("   ");
    expect(container.querySelector("button")?.disabled).toBe(true);
    renderInput("Hello", submit, true);
    act(() => container.querySelector("textarea")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(submit).not.toHaveBeenCalled();
  });

  it("sends on Enter but keeps Shift+Enter and IME composition unsent", () => {
    const submit = renderInput("Hello");
    const textarea = container.querySelector("textarea")!;
    act(() => textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true })));
    act(() => textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true })));
    expect(submit).not.toHaveBeenCalled();
    act(() => textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(submit).toHaveBeenCalledWith("Hello");
    expect(textarea.getAttribute("enterkeyhint")).toBe("send");
  });

  it("expands for multiline text and caps its height", () => {
    const ref = createRef<HTMLTextAreaElement>();
    act(() => root.render(<ChatInput textareaRef={ref} chatInput="Hello" onChange={() => {}} onSubmit={() => {}} />));
    Object.defineProperty(ref.current, "scrollHeight", { configurable: true, value: 160 });
    act(() => root.render(<ChatInput textareaRef={ref} chatInput="Hello\nMore lines" onChange={() => {}} onSubmit={() => {}} />));
    expect(ref.current?.style.height).toBe("112px");
    expect(ref.current?.style.overflowY).toBe("auto");
  });
});

describe("Chat bubbles", () => {
  it("keeps the timestamp inside a regular message bubble", () => {
    act(() => root.render(<ChatMessageItem msg={{ type: "outgoing", content: <span>Hello</span>, timestamp: new Date("2026-09-14T09:00:00Z") }} />));
    expect(container.querySelector("time")?.parentElement?.className).toContain("bg-blue-500");
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe("2026-09-14T09:00:00.000Z");
  });

  it("keeps transaction forms full-width and grouped avatars unobtrusive", () => {
    act(() => root.render(<ChatMessageItem grouped showAvatar={false} msg={{ type: "incoming", timestamp: new Date(), intent: { kind: "component", name: "TransferForm", props: {} } }} />));
    expect(container.querySelector("li")?.className).toContain("mt-1");
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("Transfer form");
    expect(container.querySelector("time")?.parentElement?.className).toContain("flex-1");
  });
});
