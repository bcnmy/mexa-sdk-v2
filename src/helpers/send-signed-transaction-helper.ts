import txDecoder from 'ethereum-tx-decoder';
import { ethers } from 'ethers';
import { IBiconomy } from '../common/types';
import { config, RESPONSE_CODES } from '../config';
import {
  callDefaultProvider, decodeMethod, formatMessage, logMessage,
} from '../utils';

/**
 * Method used to handle transaction initiated using web3.eth.sendSignedTransaction method
 * It extracts rawTransaction from payload and decode it to get required information like from, to,
 * data, gasLimit to create the payload for biconomy meta transaction API.
 * In case of Native meta transaction, payload just contains rawTransaction
 * In case of contract based meta transaction, payload contains rawTransaction and signature wrapped
 * in a json object.
 *
 * @param {Object} engine Reference to this SDK instance
 * @param {Object} payload Payload data
 */
export const sendSignedTransaction = async (
  engine: IBiconomy,
  payload: { params: any[]; },
  interfaceMap: any,
  smartContractMetaTransactionMap: any,
) => {
  if (payload && payload.params[0]) {
    const data = payload.params[0];
    let rawTransaction;
    let signature;
    let request;
    let signatureType;
    let customDomainName;
    let customDomainVersion;

    if (typeof data === 'string') {
      rawTransaction = data;
    } else if (typeof data === 'object') {
      // Here user wrapped raw Transaction in json object along with signature
      signature = data.signature;
      rawTransaction = data.rawTransaction;
      signatureType = data.signatureType;
      request = data.forwardRequest;
      customDomainName = data.domainName;
      customDomainVersion = data.domainVersion;
    }

    if (rawTransaction) {
      const decodedTx = txDecoder.decodeTx(rawTransaction);

      if (decodedTx.to && decodedTx.data && decodedTx.value) {
        const to = decodedTx.to.toLowerCase();
        let methodInfo = decodeMethod(to, decodedTx.data, interfaceMap);
        if (!methodInfo) {
          methodInfo = decodeMethod(config.SCW, decodedTx.data, interfaceMap);
          if (!methodInfo) {
            if (engine.strictMode) {
              const error = formatMessage(
                RESPONSE_CODES.DASHBOARD_DATA_MISMATCH,
                `No smart contract wallet or smart contract registered on dashboard with address (${decodedTx.to})`,
              );
              return error;
            }
            logMessage(
              'Strict mode is off so falling back to default provider for handling transaction',
            );
            if (typeof data === 'object' && data.rawTransaction) {
              payload.params = [data.rawTransaction];
            }

            try {
              return await callDefaultProvider(engine, payload, `No smart contract wallet or smart contract registered on dashboard with address (${decodedTx.to})`);
            } catch (error) {
              return error;
            }
          }
        }
        const methodName = methodInfo.name;
        let api = engine.dappAPIMap[to]
          ? engine.dappAPIMap[to][methodName]
          : undefined;
        let metaTxApproach;
        if (!api) {
          api = engine.dappAPIMap[config.SCW]
            ? engine.dappAPIMap[config.SCW][methodName]
            : undefined;
          metaTxApproach = smartContractMetaTransactionMap[config.SCW];
        } else {
          const contractAddr = api.contractAddress.toLowerCase();
          metaTxApproach = smartContractMetaTransactionMap[contractAddr];
        }
        if (!api) {
          logMessage(`API not found for method ${methodName}`);
          logMessage(`Strict mode ${engine.strictMode}`);
          if (engine.strictMode) {
            const error = formatMessage(
              RESPONSE_CODES.API_NOT_FOUND,
              `Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`,
            );
            return error;
          }
          logMessage(
            'Falling back to default provider as strict mode is false in biconomy',
          );
          if (typeof data === 'object' && data.rawTransaction) {
            payload.params = [data.rawTransaction];
          }
          try {
            return await callDefaultProvider(engine, payload, `Current provider can not sign transactions. Make sure to register method ${methodName} on Biconomy Dashboard`);
          } catch (error) {
            return error;
          }
        }
        logMessage('API found');
        const paramArray = [];
        const parsedTransaction = ethers.utils.parseTransaction(
          rawTransaction,
        );
        const account = parsedTransaction ? parsedTransaction.from : undefined;

        logMessage(`signer is ${account}`);
        if (!account) {
          const error = formatMessage(
            RESPONSE_CODES.ERROR_RESPONSE,
            'Not able to get user account from signed transaction',
          );
          return error;
        }

        /**
           * based on the api check contract meta transaction type
           * change paramArray accordingly
           * build request EDIT :
           *  do not build the request again it will result in signature mismatch
           * create domain separator based on signature type
           * use already available signature
           * send API call with appropriate parameters based on signature type
           *
           */
        let forwardedData; let
          gasLimitNum;
        let { gasLimit } = decodedTx;
        if (api.url === config.metaTxUrl) {
          if (metaTxApproach !== engine.DEFAULT) {
            // forwardedData = payload.params[0].data;
            forwardedData = decodedTx.data;

            if (!gasLimit || parseInt(gasLimit) == 0) {
              const contractABI = smartContractMap[to];
              if (contractABI) {
                const contract = new ethers.Contract(
                  to,
                  JSON.parse(contractABI),
                  engine.ethersProvider,
                );
                gasLimit = await contract.estimateGas[methodInfo.signature](
                  ...methodInfo.args,
                  { from: account },
                );

                // do not send this value in API call. only meant for txGas
                gasLimitNum = ethers.BigNumber.from(gasLimit.toString())
                  .add(ethers.BigNumber.from(5000))
                  .toNumber();
                logMessage(`gas limit number${gasLimitNum}`);
              }
            } else {
              gasLimitNum = ethers.BigNumber.from(
                gasLimit.toString(),
              ).toNumber();
            }
            logMessage(request);

            paramArray.push(request);

            const forwarderToUse = await findTheRightForwarder(engine, to);

            // Update the verifyingContract in domain data
            forwarderDomainData.verifyingContract = forwarderToUse;
            const domainDataToUse = forwarderDomainDetails[forwarderToUse];

            if (customDomainName) {
              domainDataToUse.name = customDomainName.toString();
            }

            if (customDomainVersion) {
              domainDataToUse.version = customDomainVersion.toString();
            }

            // Update the verifyingContract field of domain data based on the current request
            if (signatureType && signatureType == engine.EIP712_SIGN) {
              const domainSeparator = getDomainSeperator(
                domainDataToUse,
              );
              logMessage(domainSeparator);
              paramArray.push(domainSeparator);
            }

            paramArray.push(signature);

            const data = {};
            data.from = account;
            data.apiId = api.id;
            data.params = paramArray;
            data.to = to;
            if (signatureType && signatureType == engine.EIP712_SIGN) {
              data.signatureType = engine.EIP712_SIGN;
            }
            await _sendTransaction(engine, account, api, data, end);
          } else {
            paramArray.push(...methodInfo.args);

            const data = {};
            data.from = account;
            data.apiId = api.id;
            data.params = paramArray;
            data.gasLimit = decodedTx.gasLimit.toString(); // verify
            data.to = decodedTx.to.toLowerCase();
            await _sendTransaction(engine, account, api, data, end);
          }
        } else if (signature) {
          const relayerPayment = {};
          relayerPayment.token = config.DEFAULT_RELAYER_PAYMENT_TOKEN_ADDRESS;
          relayerPayment.amount = config.DEFAULT_RELAYER_PAYMENT_AMOUNT;

          const data = {};
          data.rawTx = rawTransaction;
          data.signature = signature;
          data.to = to;
          data.from = account;
          data.apiId = api.id;
          data.data = decodedTx.data;
          data.value = ethers.utils.hexValue(decodedTx.value);
          data.gasLimit = decodedTx.gasLimit.toString();
          data.nonceBatchId = config.NONCE_BATCH_ID;
          data.expiry = config.EXPIRY;
          data.baseGas = config.BASE_GAS;
          data.relayerPayment = {
            token: relayerPayment.token,
            amount: relayerPayment.amount,
          };
          _sendTransaction(engine, account, api, data, end);
        } else {
          const error = formatMessage(
            RESPONSE_CODES.INVALID_PAYLOAD,
            `Invalid payload data ${JSON.stringify(
              payload.params[0],
            )}. message and signature are required in param object`,
          );
          eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
          end(error);
        }
      } else {
        const error = formatMessage(
          RESPONSE_CODES.INVALID_PAYLOAD,
          'Not able to deode the data in rawTransaction using ethereum-tx-decoder. Please check the data sent.',
        );
        eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
        end(error);
      }
    } else {
      const error = formatMessage(
        RESPONSE_CODES.INVALID_PAYLOAD,
        `Invalid payload data ${JSON.stringify(
          payload.params[0],
        )}.rawTransaction is required in param object`,
      );
      return error;
    }
  } else {
    const error = formatMessage(
      RESPONSE_CODES.INVALID_PAYLOAD,
      `Invalid payload data ${JSON.stringify(
        payload.params[0],
      )}. Non empty Array expected in params key`,
    );
    return error;
  }
};
