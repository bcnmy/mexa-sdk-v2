import { ExternalProvider } from '@ethersproject/providers';

export interface IBiconomy {
  apiKey: string,
  strictMode: boolean
  provider: ExternalProvider
  dappAPIMap: any;
  signer: any;
  ethersProvider: any
  smartContractTrustedForwarderMap: any,
  forwarderAddresses: string[],
  forwarderAddress: string
}

export type HandleSendTransactionParamsType = {
  payload: any,
  interfaceMap: any
  smartContractMetaTransactionMap: any,
  smartContractMap: any,
};

export type DappDataForSystemInfoType = {
  providerNetworkId: number,
  dappNetworkId: number,
  apiKey: string,
  dappId: string,
  strictMode: boolean
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

export type JsonRpcCallback = (error: Error, response: JsonRpcResponse) => unknown;
