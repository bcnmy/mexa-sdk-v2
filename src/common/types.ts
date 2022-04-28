import { ExternalProvider } from '@ethersproject/providers';
import { Signer, Wallet } from 'ethers';

export interface IBiconomy {
  apiKey: string,
  strictMode: boolean
  provider: ExternalProvider
  dappAPIMap: any;
  signer: any;
  ethersProvider: any
}

export type DappDataForSystemInfoType = {
  providerNetworkId: number,
  dappNetworkId: number,
  apiKey: string,
  dappId: string,
};
export interface JsonRpcRequest {
  id: string | undefined;
  jsonrpc: '2.0';
  method: string;
  params?: Array<any>;
}

export interface JsonRpcResponse {
  id: string | undefined;
  jsonrpc: '2.0';
  method: string;
  result?: unknown;
  error?: Error;
}

export interface Engine {
  signer: Signer;
  walletProvider: Wallet;
  originalProvider?: any;
  canSignMessages?: any;
}

export type JsonRpcCallback = (error: Error, response: JsonRpcResponse) => unknown;
