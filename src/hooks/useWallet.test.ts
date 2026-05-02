import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWallet } from "./useWallet";
import * as viem from "viem";

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createWalletClient: vi.fn(),
    custom: vi.fn(),
  };
});

describe("useWallet", () => {
  let mockRequest: any;
  let mockOn: any;
  let mockRemoveListener: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRequest = vi.fn().mockResolvedValue([]);
    mockOn = vi.fn();
    mockRemoveListener = vi.fn();

    (window as any).ethereum = {
      request: mockRequest,
      on: mockOn,
      removeListener: mockRemoveListener,
    };
  });

  it("initializes to disconnected and attempts to restore account", async () => {
    mockRequest.mockResolvedValue(["0xAccount"]);
    
    const { result } = renderHook(() => useWallet());
    
    expect(result.current.address).toBeNull();
    expect(result.current.connected).toBe(false);

    await waitFor(() => {
      expect(result.current.address).toBe("0xAccount");
      expect(result.current.connected).toBe(true);
    });
    
    expect(mockOn).toHaveBeenCalledWith("accountsChanged", expect.any(Function));
  });

  it("handles accountsChanged event", async () => {
    mockRequest.mockResolvedValue([]);
    let accountsChangedCb: any;
    mockOn.mockImplementation((event: string, cb: any) => {
      if (event === "accountsChanged") accountsChangedCb = cb;
    });

    const { result, unmount } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(accountsChangedCb).toBeDefined();
    });

    act(() => {
      accountsChangedCb(["0xNewAccount"]);
    });

    expect(result.current.address).toBe("0xNewAccount");
    expect(result.current.connected).toBe(true);

    act(() => {
      accountsChangedCb([]);
    });

    expect(result.current.address).toBeNull();
    expect(result.current.connected).toBe(false);

    unmount();
    expect(mockRemoveListener).toHaveBeenCalledWith("accountsChanged", accountsChangedCb);
  });

  it("connect method alerts if metamask is missing", async () => {
    (window as any).ethereum = undefined;
    vi.spyOn(window, "alert").mockImplementation(() => {});
    
    const { result } = renderHook(() => useWallet());
    
    await act(async () => {
      await result.current.connect();
    });
    
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("MetaMask not detected"));
    expect(result.current.connected).toBe(false);
  });

  it("connect method creates wallet client and sets address", async () => {
    mockRequest.mockResolvedValue([]);
    
    const mockRequestAddresses = vi.fn().mockResolvedValue(["0xConnectedAccount"]);
    vi.mocked(viem.createWalletClient).mockReturnValue({
      requestAddresses: mockRequestAddresses
    } as any);
    
    const { result } = renderHook(() => useWallet());
    
    await act(async () => {
      await result.current.connect();
    });
    
    expect(viem.custom).toHaveBeenCalledWith(window.ethereum);
    expect(viem.createWalletClient).toHaveBeenCalled();
    expect(mockRequestAddresses).toHaveBeenCalled();
    
    expect(result.current.address).toBe("0xConnectedAccount");
    expect(result.current.connected).toBe(true);
  });
  
  it("connect method handles rejection/failure safely", async () => {
    mockRequest.mockResolvedValue([]);
    
    const mockRequestAddresses = vi.fn().mockRejectedValue(new Error("User rejected"));
    vi.mocked(viem.createWalletClient).mockReturnValue({
      requestAddresses: mockRequestAddresses
    } as any);
    
    const { result } = renderHook(() => useWallet());
    
    await act(async () => {
      await result.current.connect();
    });
    
    expect(result.current.address).toBeNull();
    expect(result.current.connected).toBe(false);
    expect(result.current.connecting).toBe(false);
  });

  it("disconnect method resets state", async () => {
    mockRequest.mockResolvedValue(["0xAccount"]);
    
    const { result } = renderHook(() => useWallet());
    
    await waitFor(() => {
      expect(result.current.connected).toBe(true);
    });
    
    act(() => {
      result.current.disconnect();
    });
    
    expect(result.current.address).toBeNull();
    expect(result.current.connected).toBe(false);
  });

  it("handles eth_accounts rejection gracefully", async () => {
    let rejectPromise: any;
    mockRequest.mockImplementation(() => new Promise((_, reject) => {
      rejectPromise = reject;
    }));
    
    const { result } = renderHook(() => useWallet());
    
    await act(async () => {
      rejectPromise(new Error("RPC Error"));
      // wait for microtasks
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    expect(result.current.connected).toBe(false);
  });
});
