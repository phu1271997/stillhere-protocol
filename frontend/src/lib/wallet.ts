import { simulator } from 'genlayer-js/chains';

const CHAIN_ID_HEX = "0x" + simulator.id.toString(16);

export async function ensureStudionet() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error("MetaMask wallet is not installed.");
  }
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err: any) {
    if (err.code === 4902 || err.code === -32603) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CHAIN_ID_HEX,
          chainName: "Genlayer Studio Network",
          nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
          rpcUrls: ["https://studio.genlayer.com/api"],
          blockExplorerUrls: ["https://genlayer-explorer.vercel.app"],
        }],
      });
    } else {
      throw err;
    }
  }
}

export async function connectWallet(): Promise<`0x${string}`> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error("MetaMask is required to connect to StillHere.");
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  await ensureStudionet();
  return accounts[0] as `0x${string}`;
}
