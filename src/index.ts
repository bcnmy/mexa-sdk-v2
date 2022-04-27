/**
 * @dev Biconomy class that is the entry point
 */
import EventEmitter from 'events';
import { IBiconomy } from './common/types';
import { validateOptions } from './utils';

export class Biconomy extends EventEmitter implements IBiconomy {
  apiKey: string;

  signer;

  constructor(provider: any, options: { apiKey: string; }) {
    super();
    validateOptions(options);
    this.apiKey = options.apiKey;
    this._init(this.apiKey, this);
  }

  /**
   * Function to initialize the biconomy object with DApp information.
   * It fetches the dapp's smart contract from biconomy database
   *  and initialize the decoders for each smart
   * contract which will be used to decode information during function calls.
   * @param apiKey API key used to authenticate the request at biconomy server
   * @param engine object representing biconomy provider
   * */
  async _init(apiKey: string, engine: IBiconomy) {
    try {
      engine.signer = await engine.ethersProvider.getSigner();
      // Check current network id and dapp network id registered on dashboard
      const getDappAPI = `${baseURL}/api/${config.version}/dapp`;
      fetch(getDappAPI, getFetchOptions('GET', apiKey))
        .then((response) => response.json())
        .then(async (dappResponse) => {
          _logMessage(dappResponse);
          if (dappResponse && dappResponse.dapp) {
            const dappNetworkId = dappResponse.dapp.networkId;
            const dappId = dappResponse.dapp._id;
            _logMessage(
              `Network id corresponding to dapp id ${dappId} is ${dappNetworkId}`,
            );
            const getNetworkIdOption = {
              jsonrpc: JSON_RPC_VERSION,
              id: '102',
              method: 'eth_chainId',
              params: [],
            };
            if (isEthersProvider(engine.originalProvider)) {
              let providerNetworkId = await engine.originalProvider.send('eth_chainId', []);
              if (providerNetworkId) {
                providerNetworkId = parseInt(providerNetworkId.toString());
                onNetworkId(engine, {
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
            } else {
              engine.originalProvider.send(
                getNetworkIdOption,
                (error, networkResponse) => {
                  if (error || (networkResponse && networkResponse.error)) {
                    return eventEmitter.emit(
                      EVENTS.BICONOMY_ERROR,
                      formatMessage(
                        RESPONSE_CODES.NETWORK_ID_NOT_FOUND,
                        'Could not get network version',
                      ),
                      error || networkResponse.error,
                    );
                  }
                  const providerNetworkId = parseInt(networkResponse.result.toString());
                  onNetworkId(engine, {
                    providerNetworkId, dappNetworkId, apiKey, dappId,
                  });
                },
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

