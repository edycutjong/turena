import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPublicClient, placeBetTx, MANTLE_TESTNET } from './escrow';
import * as viem from 'viem';

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>();
  return {
    ...actual,
    createPublicClient: vi.fn(),
    createWalletClient: vi.fn(),
    custom: vi.fn(),
    http: vi.fn(),
  };
});

describe('escrow.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPublicClient', () => {
    it('creates a public client with MANTLE_TESTNET and http transport', () => {
      vi.mocked(viem.http).mockReturnValue('mock-http-transport' as any);
      vi.mocked(viem.createPublicClient).mockReturnValue('mock-public-client' as any);

      const client = getPublicClient();

      expect(viem.http).toHaveBeenCalled();
      expect(viem.createPublicClient).toHaveBeenCalledWith({
        chain: MANTLE_TESTNET,
        transport: 'mock-http-transport',
      });
      expect(client).toBe('mock-public-client');
    });
  });

  describe('placeBetTx', () => {
    const mockContractAddress = '0x1234567890123456789012345678901234567890';

    beforeEach(() => {
      // Mock window.ethereum
      Object.defineProperty(global, 'window', {
        value: {
          ethereum: { isMetaMask: true },
        },
        writable: true,
      });
    });

    it('throws error if MetaMask is not found', async () => {
      Object.defineProperty(global, 'window', { value: { ethereum: undefined }, writable: true });
      await expect(placeBetTx(1, 10, mockContractAddress)).rejects.toThrow('MetaMask not found');
      
      Object.defineProperty(global, 'window', { value: undefined, writable: true });
      await expect(placeBetTx(1, 10, mockContractAddress)).rejects.toThrow('MetaMask not found');
    });

    it('creates a wallet client, switches chain, and calls writeContract', async () => {
      const mockRequestAddresses = vi.fn().mockResolvedValue(['0xAccount']);
      const mockSwitchChain = vi.fn().mockResolvedValue(undefined);
      const mockWriteContract = vi.fn().mockResolvedValue('0xTxHash');
      
      vi.mocked(viem.custom).mockReturnValue('mock-custom-transport' as any);
      vi.mocked(viem.createWalletClient).mockReturnValue({
        requestAddresses: mockRequestAddresses,
        switchChain: mockSwitchChain,
        writeContract: mockWriteContract,
      } as any);

      const hash = await placeBetTx(1, 10, mockContractAddress);

      expect(viem.custom).toHaveBeenCalledWith(window.ethereum);
      expect(viem.createWalletClient).toHaveBeenCalledWith({
        chain: MANTLE_TESTNET,
        transport: 'mock-custom-transport',
      });
      
      expect(mockRequestAddresses).toHaveBeenCalled();
      expect(mockSwitchChain).toHaveBeenCalledWith({ id: MANTLE_TESTNET.id });
      
      expect(mockWriteContract).toHaveBeenCalledWith({
        address: mockContractAddress,
        abi: expect.any(Array),
        functionName: 'placeBet',
        args: [1n, false],
        value: viem.parseEther('10'),
        account: '0xAccount',
      });
      
      expect(hash).toBe('0xTxHash');
    });
    
    it('adds chain if switchChain fails', async () => {
      const mockRequestAddresses = vi.fn().mockResolvedValue(['0xAccount']);
      const mockSwitchChain = vi.fn().mockRejectedValue(new Error('Chain not found'));
      const mockAddChain = vi.fn().mockResolvedValue(undefined);
      const mockWriteContract = vi.fn().mockResolvedValue('0xTxHash');
      
      vi.mocked(viem.custom).mockReturnValue('mock-custom-transport' as any);
      vi.mocked(viem.createWalletClient).mockReturnValue({
        requestAddresses: mockRequestAddresses,
        switchChain: mockSwitchChain,
        addChain: mockAddChain,
        writeContract: mockWriteContract,
      } as any);

      const hash = await placeBetTx(1, 10, mockContractAddress);

      expect(mockSwitchChain).toHaveBeenCalled();
      expect(mockAddChain).toHaveBeenCalledWith({ chain: MANTLE_TESTNET });
      expect(hash).toBe('0xTxHash');
    });
  });
});
