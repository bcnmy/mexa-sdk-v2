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

export type HandleSendTransactionParamsType = {
  method: string,
  params?: Array<any>
  fallback: () => Promise<any> | void | undefined
};

export type SendSingedTransactionParamsType = HandleSendTransactionParamsType;

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
