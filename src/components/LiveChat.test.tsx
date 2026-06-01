import { render, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LiveChat } from "./LiveChat";
import { supabase } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => {
  let broadcastCallback: any;
  const mockChannel = {
    on: vi.fn().mockImplementation((event, filter, callback) => {
      broadcastCallback = callback;
      return mockChannel;
    }),
    subscribe: vi.fn().mockReturnThis(),
    send: vi.fn().mockResolvedValue(undefined),
  };

  return {
    supabase: {
      channel: vi.fn(() => mockChannel),
      removeChannel: vi.fn(),
      triggerBroadcast: (payload: any) => broadcastCallback({ payload }),
    },
  };
});

describe("LiveChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders empty state initially and assigns anon username", () => {
    const { getByText, getByPlaceholderText } = render(<LiveChat />);
    expect(getByText("No messages yet…")).toBeTruthy();
    expect(getByPlaceholderText("Type a message…")).toBeTruthy();

    const username = sessionStorage.getItem("arena_name");
    expect(username).toMatch(/^viewer_\d+$/);
  });

  it("reuses stored username from sessionStorage", () => {
    sessionStorage.setItem("arena_name", "pro_trader");
    render(<LiveChat />);
    // Initial username check
    expect(sessionStorage.getItem("arena_name")).toBe("pro_trader");
  });

  it("receives broadcast chat messages and renders them", async () => {
    const { getByText, queryByText } = render(<LiveChat />);
    expect(getByText("No messages yet…")).toBeTruthy();

    await act(async () => {
      (supabase as any).triggerBroadcast({
        id: "msg-1",
        user: "whale_watcher",
        text: "MNT going to 2 USD!",
        created_at: new Date().toISOString(),
      });
    });

    expect(queryByText("No messages yet…")).toBeNull();
    expect(getByText("whale_watcher")).toBeTruthy();
    expect(getByText("MNT going to 2 USD!")).toBeTruthy();
  });

  it("handles typing and sending messages", async () => {
    sessionStorage.setItem("arena_name", "tester");
    const { getByPlaceholderText, getByText } = render(<LiveChat />);

    const input = getByPlaceholderText("Type a message…");
    const sendBtn = getByText("Send");

    // Typin empty text and sending should do nothing
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(sendBtn);
    expect(supabase.channel("live-chat").send).not.toHaveBeenCalled();

    // Type valid message and send on click
    fireEvent.change(input, { target: { value: "Hello Arena!" } });
    
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    expect(supabase.channel("live-chat").send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "broadcast",
        event: "chat",
        payload: expect.objectContaining({
          user: "tester",
          text: "Hello Arena!",
        }),
      })
    );
    expect(getByText("Hello Arena!")).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe(""); // input should be cleared

    // Send another message using Enter key
    fireEvent.change(input, { target: { value: "Next Message" } });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(getByText("Next Message")).toBeTruthy();
  });
});
