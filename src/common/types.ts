import { ExternalProvider } from '@ethersproject/providers';
import { Types } from 'mongoose';
import { ethers } from 'ethers';

export type MetaApiType = {
  apiId: string,
  name: string,
  dappId: Types.ObjectId,
  contractId: Types.ObjectId,
  method: string,
  methodType: string,
  apiType: string,
  createdOn: number,
  createdBy: Types.ObjectId,
};

export type DappApiMapType = {
  [key: string]: {
    [key: string]: MetaApiType
  }
};

export type InterfaceMapType = {
  [key: string]: ethers.utils.Interface
};

export type SmartContractMapType = {
  [key: string]: JSON
};

export type SmartContractMetaTransactionMapType = {
  [key: string]: string
};

export type SmartContractTrustedForwarderMapType = {
  [key: string]: string
};

export interface IBiconomy {
  forwarderDomainType: any;
  metaInfoType: any;
  relayerPaymentType: any;
  metaTransactionType: any;
  loginDomainType: any;
  loginMessageType: any;
  loginDomainData: any;
  forwardRequestType: any;
  forwarderDomainData: any;
  forwarderDomainDetails: any;
  trustedForwarderOverhead: any;
  TRUSTED_FORWARDER: any;
  DEFAULT: any;
  EIP712_SIGN: any;
  PERSONAL_SIGN: any;
  biconomyForwarder: ethers.Contract;
  domainType: any;
  apiKey: string,
  strictMode: boolean
  provider: ExternalProvider
  dappApiMap: DappApiMapType;
  interfaceMap: InterfaceMapType
  smartContractMap: SmartContractMapType
  smartContractMetaTransactionMap: SmartContractMetaTransactionMapType
  smartContractTrustedForwarderMap: SmartContractTrustedForwarderMapType,
  dappId: string,
  networkId: number,
  signer: any;
  ethersProvider: any
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
