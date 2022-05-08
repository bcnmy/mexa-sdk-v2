import { IBiconomy } from '../common/types';
import { BICONOMY_RESPONSE_CODES, config, RESPONSE_CODES } from '../config';
import { getFetchOptions, logMessage } from '../utils';

/**
 * Method to send the transaction to biconomy server and call the callback method
 * to pass the result of meta transaction to web3 function call.
 * @param engine Object representing biconomy provider engine
 * @param account User selected account on current wallet
 * @param data Data to be sent to biconomy server having transaction data
 * */
export const sendTransaction = async (engine: IBiconomy, account: string, data: any) => {
  if (engine && account && data) {
    const fetchOption = getFetchOptions('POST', engine.apiKey, JSON.stringify(data));
    const { metaEntryPointUrl } = config;

    fetch(`${metaEntryPointUrl}`, fetchOption)
      .then((response) => response.json())
      .then((result) => {
        logMessage.info(result);
        if (
          !result.txHash
            && result.flag !== BICONOMY_RESPONSE_CODES.ACTION_COMPLETE
            && result.flag !== BICONOMY_RESPONSE_CODES.SUCCESS
        ) {
          // Any error from relayer infra
          // TODO
          // Involve fallback here with callDefaultProvider
          const error = {};
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
        logMessage.error(error);
      });
  } else {
    logMessage.info(
      `Invalid arguments, provider: ${engine} account: ${account} api: ${api} data: ${data}`,
    );
  }
};
