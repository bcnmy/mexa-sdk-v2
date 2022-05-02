/**
 * @dev Biconomy class that is the entry point
 */
import EventEmitter from 'events';
import { ExternalProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import fetch from 'node-fetch';
import {
  DappApiMapType,
  ForwarderDomainData,
  ForwarderDomainType,
  ForwardRequestType,
  InterfaceMapType,
  JsonRpcCallback,
  JsonRpcRequest,
  SmartContractMapType,
  SmartContractMetaTransactionMapType,
  SmartContractTrustedForwarderMapType,
} from './common/types';
import {
  formatMessage, getFetchOptions, isEthersProvider, logMessage, validateOptions,
} from './utils';
import { config, EVENTS, RESPONSE_CODES } from './config';
import { handleSendTransaction } from './helpers/handle-send-transaction-helper';
import { sendSignedTransaction } from './helpers/send-signed-transaction-helper';
import { getSystemInfo } from './helpers/get-system-info-helper';
import { getForwardRequestAndMessageToSign } from './helpers/meta-transaction-EIP2771-helpers';

export class Biconomy extends EventEmitter {
  apiKey: string;

  private externalProvider: ExternalProvider;

  provider: ExternalProvider;

  dappApiMap?: DappApiMapType;

  interfaceMap?: InterfaceMapType;

  smartContractMap?: SmartContractMapType;

  smartContractMetaTransactionMap?: SmartContractMetaTransactionMapType;

  smartContractTrustedForwarderMap?: SmartContractTrustedForwarderMapType;

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

  forwarderAddresses: string[] = [];

  forwarderAddress: string = '';

  // TODO Review type
  ethersProvider: any;

  networkId?: number;

  dappId?: string;

  getSystemInfo = getSystemInfo;

  handleSendTransaction = handleSendTransaction;

  sendSignedTransaction = sendSignedTransaction;

  public getForwardRequestAndMessageToSign = getForwardRequestAndMessageToSign;

  constructor(provider: ExternalProvider, options: { apiKey: string; strictMode: boolean }) {
    super();
    validateOptions(options);
    this.apiKey = options.apiKey;
    this.strictMode = options.strictMode || false;
    this.externalProvider = provider;
    this.provider = this.proxyFactory();

    if (isEthersProvider(provider)) {
      this.ethersProvider = provider;
    } else {
      this.ethersProvider = new ethers.providers.Web3Provider(provider);
    }
  }

  private proxyFactory() {
    return new Proxy(this.externalProvider, this.proxyProvider);
  }

  proxyProvider = {
    // Difference between send and request
    get: (target: ExternalProvider, prop: string, ...args: any[]) => {
      switch (prop) {
        case 'send':
          return this.handleRpcSend;
        case 'sendAsync':
          return this.handleRpcSendAsync;
        case 'request':
          return this.handleRpcRequest;
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
          return await this.handleSendTransaction({ method, params, fallback });
        case 'eth_sendRawTransaction':
          return await this.sendSignedTransaction({ method, params, fallback });
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
          return await this.handleSendTransaction({ method, params, fallback });
        case 'eth_sendRawTransaction':
          return await this.sendSignedTransaction({ method, params, fallback });
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
          return await this.handleSendTransaction({ method, params, fallback });
        case 'eth_sendRawTransaction':
          return await this.sendSignedTransaction({ method, params, fallback });
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
          return await this.handleSendTransaction({ method, params, fallback });
        case 'eth_sendRawTransaction':
          return await this.sendSignedTransaction({ method, params, fallback });
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
          return this.handleSendTransaction({ method, params, fallback });
        case 'eth_sendRawTransaction':
          return this.sendSignedTransaction({ method, params, fallback });
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
   * @param apiKey API key used to authenticate the request at biconomy server
   * */
  async _init(apiKey: string) {
    try {
      this.signer = await this.ethersProvider.getSigner();
      // Check current network id and dapp network id registered on dashboard
      const { getDappDataUrl } = config;
      fetch(getDappDataUrl, getFetchOptions('GET', apiKey))
        .then((response) => response.json())
        // eslint-disable-next-line consistent-return
        .then(async (response) => {
          logMessage(JSON.stringify(response));
          // TODO Review response type
          const dappData = (response as any).data;
          if (dappData && dappData.dapp) {
            this.networkId = dappData.dapp.networkId;
            this.dappId = dappData.dapp._id;
            logMessage(
              `Network id corresponding to dapp id ${this.dappId} is ${this.networkId}`,
            );

            let providerNetworkId = await this.ethersProvider.send('eth_chainId', []);
            if (providerNetworkId) {
              providerNetworkId = parseInt(providerNetworkId.toString(), 10);
              // TODO
              this.getSystemInfo(providerNetworkId);
            } else {
              return this.emit(
                EVENTS.BICONOMY_ERROR,
                formatMessage(
                  RESPONSE_CODES.NETWORK_ID_NOT_FOUND,
                  'Could not get network version',
                ),
                'Could not get network version',
              );
            }
          } else if (dappData.error) {
            this.emit(
              EVENTS.BICONOMY_ERROR,
              formatMessage(RESPONSE_CODES.ERROR_RESPONSE, dappData.error),
            );
          } else {
            this.emit(
              EVENTS.BICONOMY_ERROR,
              formatMessage(
                RESPONSE_CODES.DAPP_NOT_FOUND,
                `No Dapp Registered with apikey ${apiKey}`,
              ),
            );
          }
        })
        .catch((error) => {
          this.emit(
            EVENTS.BICONOMY_ERROR,
            formatMessage(
              RESPONSE_CODES.ERROR_RESPONSE,
              'Error while initializing Biconomy',
            ),
            error,
          );
        });
    } catch (error) {
      this.emit(
        EVENTS.BICONOMY_ERROR,
        formatMessage(
          RESPONSE_CODES.ERROR_RESPONSE,
          'Error while initializing Biconomy',
        ),
        error,
      );
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
