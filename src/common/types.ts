import { Signer, Wallet } from 'ethers';

export interface IBiconomy {
  apiKey: string;
  signer: Signer;
}

export interface Engine {
  signer: Signer;
  walletProvider: Wallet;
  originalProvider?: any;
  canSignMessages?: any;
}
