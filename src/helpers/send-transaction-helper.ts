/**
 * Method to send the transaction to biconomy server and call the callback method
 * to pass the result of meta transaction to web3 function call.
 * @param engine Object representing biconomy provider engine
 * @param account User selected account on current wallet
 * @param api API object got from biconomy server
 * @param data Data to be sent to biconomy server having transaction data
 * @param cb Callback method to be called to pass result or send error
 * */
async function _sendTransaction(engine, account, api, data, cb) {
  if (engine && account && api && data) {
    const { url } = api;
    const fetchOption = getFetchOptions('POST', engine.apiKey);
    fetchOption.body = JSON.stringify(data);

    fetch(`${baseURL}${url}`, fetchOption)
      .then((response) => response.json())
      .then((result) => {
        _logMessage(result);
        if (
          !result.txHash
            && result.flag != BICONOMY_RESPONSE_CODES.ACTION_COMPLETE
            && result.flag != BICONOMY_RESPONSE_CODES.SUCCESS
        ) {
          // Any error from relayer infra
          // TODO
          // Involve fallback here with callDefaultProvider
          const error = {};
          error.code = result.flag || result.code;
          if (result.flag == BICONOMY_RESPONSE_CODES.USER_CONTRACT_NOT_FOUND) {
            error.code = RESPONSE_CODES.USER_CONTRACT_NOT_FOUND;
          }
          error.message = result.log || result.message;
          if (cb) cb(error);
        } else {
          // TODO
          // Include listerner that will itself check for resubmitted hash api and serve over a socket?
          if (cb) cb(null, result.txHash);
        }
      })
      .catch((error) => {
        _logMessage(error);
        if (cb) cb(error);
      });
  } else {
    _logMessage(
      `Invalid arguments, provider: ${engine} account: ${account} api: ${api} data: ${data}`,
    );
    if (cb) {
      cb(
        `Invalid arguments, provider: ${engine} account: ${account} api: ${api} data: ${data}`,
        null,
      );
    }
  }
}
