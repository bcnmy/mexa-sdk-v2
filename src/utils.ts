import log4js from 'log4js';
import { OptionsType } from './common/types';

// log level - ALL < TRACE < DEBUG < INFO < WARN < ERROR < FATAL < MARK < OFF
const logger = log4js.configure({
  appenders: {
    console: { type: 'console' },
  },
  categories: {
    trace: { appenders: ['console'], level: 'trace' },
    debug: { appenders: ['console'], level: 'debug' },
    info: { appenders: ['console'], level: 'info' },
    error: { appenders: ['console'], level: 'error' },
  },
});

export const logMessage = logger.getLogger('debug');

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

  if (!options.contractAddresses) {
    throw new Error(
      'contractAddresses is required in options object when creating Biconomy object',
    );
  }
};

export const decodeMethod = (to: string, data: any, interfaceMap: any) => {
  if (to && data && interfaceMap[to]) {
    return interfaceMap[to].parseTransaction({ data });
  }
  throw new Error(
    'to, data or interfaceMap are undefined',
  );
};
