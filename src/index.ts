/**
 * @dev Biconomy class that is the entry point
 */
import EventEmitter from 'events';
import { ExternalProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import {
  DappDataForSystemInfoType, IBiconomy, JsonRpcCallback, JsonRpcRequest,
} from './common/types';
import {
  formatMessage, getFetchOptions, isEthersProvider, logMessage, validateOptions,
} from './utils';
import { config, RESPONSE_CODES } from './config';
import { handleSendTransaction } from './helpers/handle-send-transaction-helper';
import { sendSignedTransaction } from './helpers/send-signed-transaction-helper';
import { getSystemInfo } from './helpers/get-system-info-helper';

const { JSON_RPC_VERSION } = config;

export class Biconomy extends EventEmitter implements IBiconomy {
  apiKey: string;

  private externalProvider: ExternalProvider;

  provider: ExternalProvider;

  dappAPIMap = {};

  interfaceMap = {};

  smartContractMap = {};

  smartContractMetaTransactionMap = {};

  smartContractTrustedForwarderMap = {};

  strictMode = false;

  signer: any;

  // Review type
  ethersProvider: any;

  networkId: number = 0;

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
  }

  async handleRpcSendType2(method: string, params?: Array<unknown>) {
    // need to use ts-ignore because ethers externalProvider
    // type does not have full coverage of send method

    // @ts-ignore
    const fallback = () => this.externalProvider.send?.(method, params);
  }

  async handleRpcSendType3(payload: JsonRpcRequest) {
    // need to use ts-ignore because ethers externalProvider
    // type does not have full coverage of send method

    // @ts-ignore
    const fallback = () => this.externalProvider.send?.(payload);
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

  handleRpcSendAsync(payload: JsonRpcRequest, callback: JsonRpcCallback) {
    const fallback = () => this.externalProvider.sendAsync?.(payload, callback);
  }

  handleRpcRequest({ method, params } : { method: string, params: string[] }) {
    const fallback = () => this.externalProvider.request?.({ method, params });

    try {
      switch (method) {
        case 'eth_sendTransaction':
          return this._handleSendTransaction(method, params);
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
      const getDappAPI = config.getApisPerDappUrl;
      fetch(getDappAPI, getFetchOptions('GET', apiKey))
        .then((response) => response.json())
        .then(async (dappResponse) => {
          logMessage(dappResponse);
          if (dappResponse && dappResponse.dapp) {
            const dappNetworkId = dappResponse.dapp.networkId;
            const dappId = dappResponse.dapp._id;
            logMessage(
              `Network id corresponding to dapp id ${dappId} is ${dappNetworkId}`,
            );

            let providerNetworkId = await this.ethersProvider.send('eth_chainId', []);
            if (providerNetworkId) {
              providerNetworkId = parseInt(providerNetworkId.toString(), 10);
              this._getSystemInfo({
                providerNetworkId, dappNetworkId, apiKey, dappId,
              });
            } else {
              return eventEmitter.emit(
                EVENTS.BICONOMY_ERROR,
                formatMessage(
                  RESPONSE_CODES.NETWORK_ID_NOT_FOUND,
                  'Could not get network version',
                ),
                'Could not get network version',
              );
            }
          } else if (dappResponse.log) {
            eventEmitter.emit(
              EVENTS.BICONOMY_ERROR,
              formatMessage(RESPONSE_CODES.ERROR_RESPONSE, dappResponse.log),
            );
          } else {
            eventEmitter.emit(
              EVENTS.BICONOMY_ERROR,
              formatMessage(
                RESPONSE_CODES.DAPP_NOT_FOUND,
                `No Dapp Registered with apikey ${apiKey}`,
              ),
            );
          }
        })
        .catch((error) => {
          eventEmitter.emit(
            EVENTS.BICONOMY_ERROR,
            formatMessage(
              RESPONSE_CODES.ERROR_RESPONSE,
              'Error while initializing Biconomy',
            ),
            error,
          );
        });
    } catch (error) {
      eventEmitter.emit(
        EVENTS.BICONOMY_ERROR,
        formatMessage(
          RESPONSE_CODES.ERROR_RESPONSE,
          'Error while initializing Biconomy',
        ),
        error,
      );
    }
  }

  async _getSystemInfo(dappDataForSystemInfo: DappDataForSystemInfoType) {
    this.networkId = dappDataForSystemInfo.providerNetworkId;
    return getSystemInfo(this, dappDataForSystemInfo);
  }

  async _handleSendTransaction(method, params) {
    return handleSendTransaction(this, method, params);
  }

  async _sendSignedTransaction() {
    return sendSignedTransaction(this);
  }
}
