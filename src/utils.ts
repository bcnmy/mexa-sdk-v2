import { ExternalProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import { IBiconomy } from './common/types';

/**
 * Single method to be used for logging purpose.
 *
 * @param {string} message Message to be logged
 */
export const logMessage = (message: string) => {
  console.log(message);
};

export const getFetchOptions = (method: string, apiKey: string, data?: string) => ({
  method,
  headers: {
    'x-api-key': apiKey,
    'Content-Type': 'application/json;charset=utf-8',
  },
  body: data,
});

export const formatMessage = (code: string, message: string) => ({ code, message });

/**
 * Validate parameters passed to biconomy object. Dapp id and api key are mandatory.
 * */
// TODO more options would be added so update this
export const validateOptions = (options: { apiKey: string; strictMode: boolean }) => {
  if (!options) {
    throw new Error(
      'Options object needs to be passed to Biconomy Object with apiKey as mandatory key',
    );
  }
  if (!options.apiKey) {
    throw new Error(
      'apiKey is required in options object when creating Biconomy object',
    );
  }
};

// TODO review types for data and interfaceMap
export const decodeMethod = (to: string, data: any, interfaceMap: any) => {
  if (to && data && interfaceMap[to]) {
    return interfaceMap[to].parseTransaction({ data });
  }
  throw new Error(
    'to, data or interfaceMap is undefined',
  );
};

export const isEthersProvider = (
  provider: ExternalProvider,
) => ethers.providers.Provider.isProvider(provider);

export const callDefaultProvider = async (engine, payload, errorMessage) => {
  try {
    const targetProvider = getTargetProvider(engine);
    if (targetProvider) {
      if (isEthersProvider(targetProvider)) {
        const responseFromProvider = await targetProvider.send(payload.method, payload.params);
        _logMessage('Response from original provider', responseFromProvider);
        callback(null, responseFromProvider);
        return responseFromProvider;
      }
      return targetProvider.send(payload, callback);
    }

    logMessage('No provider present in Biconomy that can sign messages');
    throw new Error(errorMessage);
  } catch (e) {
    logMessage('Unexpected error occured when calling default provider');
    logMessage(e);
    return callback(e);
  }
};

export const getTargetProvider = (engine: IBiconomy) => {
  let provider;
  if (engine) {
    provider = engine.originalProvider;
    if (!engine.canSignMessages) {
      if (!engine.walletProvider) {
        throw new Error('Please pass a provider connected to a wallet that can sign messages in Biconomy options.');
      }
      provider = engine.walletProvider;
    }
  }
  return provider;
};
