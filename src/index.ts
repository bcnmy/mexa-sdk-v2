/* eslint-disable consistent-return */
/**
 * @dev Biconomy class that is the entry point
 */
import EventEmitter from 'events';
import { ExternalProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import { get } from 'request-promise';
import {
  DappApiMapType,
  ForwarderDomainData,
  ForwarderDomainType,
  ForwardRequestType,
  InterfaceMapType,
  JsonRpcCallback,
  JsonRpcRequest,
  MetaApiType,
  OptionsType,
  SmartContractMapType,
  SmartContractMetaTransactionMapType,
  SmartContractTrustedForwarderMapType,
  SmartContractType,
} from './common/types';
import {
  logMessage, validateOptions,
} from './utils';
import { config } from './config';
import { handleSendTransaction } from './helpers/handle-send-transaction-helper';
import { sendSignedTransaction } from './helpers/send-signed-transaction-helper';
import { getSystemInfo } from './helpers/get-system-info-helper';
// import { getForwardRequestAndMessageToSign } from './helpers/meta-transaction-EIP2771-helpers';
import { getSignatureEIP712, getSignaturePersonal } from './helpers/signature-helpers';
import { sendTransaction } from './helpers/send-transaction-helper';

export class Biconomy extends EventEmitter {
  apiKey: string;

  private externalProvider: ExternalProvider;

  readOnlyProvider?: ethers.providers.JsonRpcProvider;

  provider: ExternalProvider;

  dappApiMap: DappApiMapType = {};

  interfaceMap: InterfaceMapType = {};

  smartContractMap: SmartContractMapType = {};

  smartContractMetaTransactionMap: SmartContractMetaTransactionMapType = {};

  smartContractTrustedForwarderMap: SmartContractTrustedForwarderMapType = {};

  strictMode = false;

  signer: any;

  forwarderDomainType?: ForwarderDomainType;

  defaultMetaTransaction?: string;

  trustedForwarderMetaTransaction?: string;

  forwardRequestType?: ForwardRequestType;

  forwarderDomainData?: ForwarderDomainData;

  forwarderDomainDetails?: Array<ForwarderDomainData>;

  eip712Sign?: string;

  personalSign?: string;

  biconomyForwarder?: ethers.Contract;

  forwarderAddresses?: string[];

  forwarderAddress?: string;

  ethersProvider: ethers.providers.Web3Provider;

  networkId?: number;

  dappId?: string;

  getSystemInfo = getSystemInfo;

  handleSendTransaction = handleSendTransaction;

  sendTransaction = sendTransaction;

  sendSignedTransaction = sendSignedTransaction;

  getSignatureEIP712 = getSignatureEIP712;

  getSignaturePersonal = getSignaturePersonal;

  // public getForwardRequestAndMessageToSign = getForwardRequestAndMessageToSign;

  constructor(provider: ExternalProvider, options: OptionsType) {
    super();
    validateOptions(options);
    this.apiKey = options.apiKey;
    this.strictMode = options.strictMode || false;
    this.externalProvider = provider;
    this.provider = this.proxyFactory();

    if (options.jsonRpcUrl) {
      this.readOnlyProvider = new ethers.providers.JsonRpcProvider(options.jsonRpcUrl);
    }
    this.ethersProvider = new ethers.providers.Web3Provider(provider);
  }

  private proxyFactory() {
    return new Proxy(this.externalProvider, this.proxyProvider);
  }

  proxyProvider = {
    // Difference between send and request
    get: (target: ExternalProvider, prop: string, ...args: any[]) => {
      switch (prop) {
        case 'send':
          return this.handleRpcSend.bind(this);
        case 'sendAsync':
          return this.handleRpcSendAsync.bind(this);
        case 'request':
          return this.handleRpcRequest.bind(this);
        default:
          break;
      }
      return Reflect.get(target, prop, ...args);
    },
  };

  async handleRpcSendType1(payload: JsonRpcRequest, callback: JsonRpcCallback) {
    const fallback = () => this.externalProvider.send?.(payload, callback);
    const { method, params } = payload;
    try {
      switch (method) {
        case 'eth_sendTransaction':
          return await this.handleSendTransaction({ params, fallback });
        case 'eth_sendRawTransaction':
          return await this.sendSignedTransaction({ params, fallback });
        default:
          return fallback();
      }
    } catch (e) {
      return fallback();
    }
  }

  async handleRpcSendType2(method: string, params?: Array<unknown>) {
    // need to use ts-ignore because ethers externalProvider
    // type does not have full coverage of send method

    // @ts-ignore
    const fallback = () => this.externalProvider.send?.(method, params);
    try {
      switch (method) {
        case 'eth_sendTransaction':
          return await this.handleSendTransaction({ params, fallback });
        case 'eth_sendRawTransaction':
          return await this.sendSignedTransaction({ params, fallback });
        default:
          return fallback();
      }
    } catch (e) {
      return fallback();
    }
  }

  async handleRpcSendType3(payload: JsonRpcRequest) {
    // need to use ts-ignore because ethers externalProvider
    // type does not have full coverage of send method

    // @ts-ignore
    const fallback = () => this.externalProvider.send?.(payload);
    const { method, params } = payload;
    try {
      switch (method) {
        case 'eth_sendTransaction':
          return await this.handleSendTransaction({ params, fallback });
        case 'eth_sendRawTransaction':
          return await this.sendSignedTransaction({ params, fallback });
        default:
          return fallback();
      }
    } catch (e) {
      return fallback();
    }
  }

  handleRpcSend(...args: any[]) {
    // provider.send is deprecated, but it is still commonly used, so we need to handle it
    // it has three signatures, and we need to support all of them.

    // ethereum.send(
    //   methodOrPayload: string | JsonRpcRequest,
    //   paramsOrCallback: Array<unknown> | JsonRpcCallback,
    // ): Promise<JsonRpcResponse> | void;

    // Type 1:
    // ethereum.send(payload: JsonRpcRequest, callback: JsonRpcCallback): void;

    // Type 2:
    // ethereum.send(method: string, params?: Array<unknown>): Promise<JsonRpcResponse>;

    // Type 3:
    // ethereum.send(payload: JsonRpcRequest): unknown;

    if (typeof args[0] === 'string') {
      // this is type 2
      return this.handleRpcSendType2(args[0] as string, args[1] as Array<unknown>);
    }

    if (!args[1]) {
      // this is type 3
      return this.handleRpcSendType3(args[0] as JsonRpcRequest);
    }

    // this is type 1
    return this.handleRpcSendType1(args[0] as JsonRpcRequest, args[1] as JsonRpcCallback);
  }

  async handleRpcSendAsync(payload: JsonRpcRequest, callback: JsonRpcCallback) {
    const fallback = () => this.externalProvider.sendAsync?.(payload, callback);

    const { method, params } = payload;
    try {
      switch (method) {
        case 'eth_sendTransaction':
          return await this.handleSendTransaction({ params, fallback });
        case 'eth_sendRawTransaction':
          return await this.sendSignedTransaction({ params, fallback });
        default:
          return fallback();
      }
    } catch (e) {
      return fallback();
    }
  }

  handleRpcRequest({ method, params } : { method: string, params: string[] }) {
    const fallback = () => this.externalProvider.request?.({ method, params });

    try {
      switch (method) {
        case 'eth_sendTransaction':
          return this.handleSendTransaction({ params, fallback });
        case 'eth_sendRawTransaction':
          return this.sendSignedTransaction({ params, fallback });
        default:
          return fallback();
      }
    } catch (e) {
      return fallback();
    }
  }

  /**
   * Function to initialize the biconomy object with DApp information.
   * It fetches the dapp's smart contract from biconomy database
   *  and initialize the decoders for each smart
   * contract which will be used to decode information during function calls.
   * */
  async init() {
    try {
      this.signer = this.ethersProvider.getSigner();
      await this.getDappData();
      const providerNetworkId = (await this.ethersProvider.getNetwork()).chainId;

      if (providerNetworkId) {
        if (providerNetworkId !== this.networkId) {
          throw new Error(`Current networkId ${providerNetworkId} is different from dapp network id registered on mexa dashboard ${this.networkId}`);
        }
        await this.getSystemInfo(providerNetworkId);
      } else {
        throw new Error('Could not get network version');
      }
    } catch (error) {
      return error;
    }
  }

  async getDappData() {
    try {
      const { getDappDataUrl } = config;
      const options = {
        uri: getDappDataUrl,
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json;charset=utf-8',
        },
      };
      const response = await get(options);
      const { data } = JSON.parse(response);

      if (response.code !== 200) {
        throw new Error(data.log);
      }

      const { dapp, smartContracts, metaApis } = data;
      this.networkId = dapp.networkId;
      this.dappId = dapp._id;

      if (smartContracts && smartContracts.length > 0) {
        smartContracts.forEach((contract: SmartContractType) => {
          const contractInterface = new ethers.utils.Interface(JSON.parse(contract.abi.toString()));
          this.smartContractMetaTransactionMap[
            contract.address.toLowerCase()
          ] = contract.metaTransactionType;
          this.interfaceMap[
            contract.address.toLowerCase()
          ] = contractInterface;
          this.smartContractMap[
            contract.address.toLowerCase()
          ] = contract.abi.toString();
        });
      }
      if (metaApis && metaApis.length > 0) {
        metaApis.forEach((metaApi: MetaApiType) => {
          const { contractAddress } = metaApi;
          this.dappApiMap[contractAddress][metaApi.method] = metaApi;
        });
      }
    } catch (error) {
      logMessage(JSON.stringify(error));
      throw error;
    }
  }

  private setSmartContractMetaTransactionMap(newSmartContractMetatransactionMap: any) {
    this.smartContractMetaTransactionMap = newSmartContractMetatransactionMap;
  }

  private setSmartContractTrustedForwarderMap(newSmartContractTrustedForwarderMap: any) {
    this.smartContractTrustedForwarderMap = newSmartContractTrustedForwarderMap;
  }

  private setInterfaceMap(newInterfaceMap: any) {
    this.interfaceMap = newInterfaceMap;
  }

  private setSmartContractMap(newSmartContractMap: any) {
    this.smartContractMap = newSmartContractMap;
  }

  private setDappApiMap(newDappApiMap: any) {
    this.dappApiMap = newDappApiMap;
  }
}
