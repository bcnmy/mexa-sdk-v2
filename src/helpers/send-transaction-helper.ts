import { post } from 'request-promise';
import type { Biconomy } from '..';
import { BICONOMY_RESPONSE_CODES, config, RESPONSE_CODES } from '../config';
import { logMessage } from '../utils';
import { mexaSdkClientMessenger } from './client-messaging-helper';

/**
 * Method to send the transaction to biconomy server and call the callback method
 * to pass the result of meta transaction to web3 function call.
 * @param this Object representing biconomy provider this
 * @param account User selected account on current wallet
 * @param data Data to be sent to biconomy server having transaction data
 * */
export async function sendTransaction(this: Biconomy, account: string, data: any) {
  if (!this || !account || !data) {
    return undefined;
  }

  const options = {
    uri: `${config.metaEntryPointBaseUrl}/api/v2/meta-tx/native`,
    headers: {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json;charset=utf-8',
    },
    timeout: 600000, // 10 min
    body: JSON.stringify(data),
  };

  logMessage('request body');
  logMessage(JSON.stringify(data));

  const response = await post(options);
  logMessage(response);
  const result = JSON.parse(response);

  if (result.transactionId && result.flag === BICONOMY_RESPONSE_CODES.SUCCESS) {
    await mexaSdkClientMessenger({
      transactionId: result.transactionId,
    });
  }
  const error:any = {};
  error.code = result.flag || result.code;
  if (result.flag === BICONOMY_RESPONSE_CODES.USER_CONTRACT_NOT_FOUND) {
    error.code = RESPONSE_CODES.USER_CONTRACT_NOT_FOUND;
  }
  error.message = result.log || result.message;
  return error.toString();
}
