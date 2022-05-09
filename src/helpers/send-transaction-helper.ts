import { post } from 'request-promise';
import type { Biconomy } from '..';
import { BICONOMY_RESPONSE_CODES, config, RESPONSE_CODES } from '../config';
import { logMessage } from '../utils';

/**
 * Method to send the transaction to biconomy server and call the callback method
 * to pass the result of meta transaction to web3 function call.
 * @param this Object representing biconomy provider this
 * @param account User selected account on current wallet
 * @param data Data to be sent to biconomy server having transaction data
 * */
export async function sendTransaction(this: Biconomy, account: string, data: any) {
  if (this && account && data) {
    const { metaEntryPointBaseUrl } = config;

    const options = {
      uri: metaEntryPointBaseUrl,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json;charset=utf-8',
      },
      body: JSON.stringify(data),
    };

    post(options)
      .then((response: any) => response.json())
      .then((result: any) => {
        logMessage(result);
        if (
          !result.txHash
            && result.flag !== BICONOMY_RESPONSE_CODES.ACTION_COMPLETE
            && result.flag !== BICONOMY_RESPONSE_CODES.SUCCESS
        ) {
          // Any error from relayer infra
          // TODO
          // Involve fallback here with callDefaultProvider
          const error:any = {};
          error.code = result.flag || result.code;
          if (result.flag === BICONOMY_RESPONSE_CODES.USER_CONTRACT_NOT_FOUND) {
            error.code = RESPONSE_CODES.USER_CONTRACT_NOT_FOUND;
          }
          error.message = result.log || result.message;
        } else {
          // TODO add code
        }
      })
      .catch((error) => {
        logMessage(error);
      });
  } else {
    logMessage(
      `Invalid arguments, provider: ${this} account: ${account} data: ${data}`,
    );
  }
}
