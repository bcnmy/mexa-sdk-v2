import { OptionsType } from './common/types';

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
export const validateOptions = (options: OptionsType) => {
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

  if (!options.contractAddress) {
    throw new Error(
      'contractAddress is required in options object when creating Biconomy object',
    );
  }

  if (!options.contractAbi) {
    throw new Error(
      'contractAbi is required in options object when creating Biconomy object',
    );
  }
};

export const decodeMethod = (to: string, data: any, interfaceMap: any) => {
  if (to && data && interfaceMap[to]) {
    return interfaceMap[to].parseTransaction({ data });
  }
  throw new Error(
    'to, data or interfaceMap is undefined',
  );
};
