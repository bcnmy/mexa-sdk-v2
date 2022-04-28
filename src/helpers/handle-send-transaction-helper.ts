import { ethers } from 'ethers';
import { HandleSendTransactionParamsType, IBiconomy } from '../common/types';
import { config, RESPONSE_CODES } from '../config';
import { decodeMethod, formatMessage, logMessage } from '../utils';
import { buildForwardTxRequest, findTheRightForwarder, getDomainSeperator } from './Meta-transaction-EIP2771-helpers';
import { getSignatureEIP712, getSignaturePersonal } from './signature-helpers';

/**
  * Function decodes the parameter in payload and gets the user signature using eth_signTypedData_v4
  * method and send the request to biconomy for processing and call the callback method 'end'
  * with transaction hash.
  * This is an internal function that is called
  * while intercepting eth_sendTransaction RPC method call.
* */
export const handleSendTransaction = async (
  engine: IBiconomy,
  handleSendTransactionParams: HandleSendTransactionParamsType,
) => {
  try {
    const {
      payload, interfaceMap, smartContractMetaTransactionMap, smartContractMap,
    } = handleSendTransactionParams;
    logMessage('Handle transaction with payload');
    logMessage(payload);
    if (payload.params && payload.params[0] && payload.params[0].to) {
      const to = payload.params[0].to.toLowerCase();
      if (interfaceMap[to] || interfaceMap[config.SCW]) {
        let methodInfo = decodeMethod(to, payload.params[0].data, interfaceMap);

        // Check if the Smart Contract Wallet is registered on dashboard
        if (!methodInfo) {
          methodInfo = decodeMethod(config.SCW, payload.params[0].data, interfaceMap);
        }
        if (!methodInfo) {
          const error = {
            code: RESPONSE_CODES.WRONG_ABI,
            message: 'Can\'t decode method information from payload. Make sure you have uploaded correct ABI on Biconomy Dashboard',
          };
          return error;
        }
        const methodName = methodInfo.name;
        let api = engine.dappAPIMap[to]
          ? engine.dappAPIMap[to][methodName]
          : undefined;
          // Information we get here is contractAddress, methodName, methodType, ApiId
        let metaTxApproach;
        let customBatchId;
        let customDomainName; let
          customDomainVersion;
        let signTypedDataType;
        if (!api) {
          api = engine.dappAPIMap[config.SCW]
            ? engine.dappAPIMap[config.SCW][methodName]
            : undefined;
          metaTxApproach = smartContractMetaTransactionMap[config.SCW];
        } else {
          const contractAddr = api.contractAddress.toLowerCase();
          metaTxApproach = smartContractMetaTransactionMap[contractAddr];
        }

        // Sanitise gas limit here. big number / hex / number -> hex
        let gasLimit = payload.params[0].gas || payload.params[0].gasLimit;
        if (gasLimit) {
          gasLimit = ethers.BigNumber.from(gasLimit.toString()).toHexString();
        }
        let { txGas } = payload.params[0];
        const { signatureType } = payload.params[0];
        if (payload.params[0].batchId) {
          customBatchId = Number(payload.params[0].batchId);
        }

        if (payload.params[0].domainName) {
          customDomainName = payload.params[0].domainName;
        }

        if (payload.params[0].domainVersion) {
          customDomainVersion = payload.params[0].domainVersion;
        }

        if (payload.params[0].signTypedDataType) {
          signTypedDataType = payload.params[0].signTypedDataType;
        }

        logMessage(payload.params[0]);
        logMessage(api);
        logMessage(`gas limit : ${gasLimit}`);
        if (txGas) {
          logMessage(`tx gas supplied : ${txGas}`);
        }

        if (!api) {
          logMessage(`API not found for method ${methodName}`);
          logMessage(`Strict mode ${engine.strictMode}`);
          if (engine.strictMode) {
            const error = {
              code: RESPONSE_CODES.API_NOT_FOUND,
              message: `Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`,
            };
            return error;
          }
          logMessage(
            'Falling back to default provider as strict mode is false in biconomy',
          );
          return {
            code: 1, // call fallback
          };
        }
        logMessage('API found');

        logMessage('Getting user account');
        const account = payload.params[0].from;

        if (!account) {
          return {
            message: 'Not able to get user account',
          };
        }
        logMessage('User account fetched');

        logMessage(methodInfo.args);
        const paramArray = [];

        let forwardedData; let
          gasLimitNum;

        if (api.url === NATIVE_META_TX_URL) {
          if (metaTxApproach === engine.TRUSTED_FORWARDER) {
            logMessage('Smart contract is configured to use Trusted Forwarder as meta transaction type');
            forwardedData = payload.params[0].data;

            const signatureFromPayload = payload.params[0].signature;
            // Check if txGas is present, if not calculate gas limit for txGas

            if (!txGas || parseInt(txGas, 10) === 0) {
              const contractABI = smartContractMap[to];
              if (contractABI) {
                const contract = new ethers.Contract(
                  to,
                  JSON.parse(contractABI),
                  engine.ethersProvider,
                );
                txGas = await contract.estimateGas[methodInfo.signature](
                  ...methodInfo.args,
                  { from: account },
                );
                // do not send this value in API call. only meant for txGas
                gasLimitNum = ethers.BigNumber.from(txGas.toString())
                  .add(ethers.BigNumber.from(5000))
                  .toNumber();

                logMessage(`Gas limit (txGas) calculated for method ${methodName} in SDK: ${gasLimitNum}`);
              } else {
                const error = formatMessage(
                  RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND,
                  'Smart contract ABI not found!',
                );
                return error;
              }
            } else {
              logMessage(`txGas supplied for this Trusted Forwarder call is ${Number(txGas)}`);
              gasLimitNum = ethers.BigNumber.from(
                txGas.toString(),
              ).toNumber();
              logMessage(`gas limit number for txGas ${gasLimitNum}`);
            }

            // TODO
            // get the new smartContractTrustedForwarderMap and set it on the instance
            const forwarderToAttach = await findTheRightForwarder(engine, to);

            const { request } = await buildForwardTxRequest(
              account,
              to,
              gasLimitNum, // txGas
              forwardedData,
              biconomyForwarder.attach(forwarderToAttach),
              customBatchId,
            );
            logMessage(JSON.stringify(request));

            paramArray.push(request);

            forwarderDomainData.verifyingContract = forwarderToAttach;
            const domainDataToUse = forwarderDomainDetails[forwarderToAttach];

            if (customDomainName) {
              domainDataToUse.name = customDomainName.toString();
            }

            if (customDomainVersion) {
              domainDataToUse.version = customDomainVersion.toString();
            }

            if (signatureType && signatureType === engine.EIP712_SIGN) {
              logMessage('EIP712 signature flow');
              // Update the verifyingContract field of domain data based on the current request
              const domainSeparator = getDomainSeperator(
                domainDataToUse,
              );
              logMessage('Domain separator to be used:');
              logMessage(domainSeparator);
              paramArray.push(domainSeparator);
              let signatureEIP712;
              if (signatureFromPayload) {
                signatureEIP712 = signatureFromPayload;
                logMessage(`EIP712 signature from payload is ${signatureEIP712}`);
              } else {
                signatureEIP712 = await getSignatureEIP712(
                  engine,
                  account,
                  request,
                  forwarderToAttach,
                  domainDataToUse,
                  signTypedDataType,
                );
                logMessage(`EIP712 signature is ${signatureEIP712}`);
              }
              paramArray.push(signatureEIP712);
            } else {
              logMessage('Personal signature flow');
              let signaturePersonal;
              if (signatureFromPayload) {
                signaturePersonal = signatureFromPayload;
                logMessage(`Personal signature from payload is ${signaturePersonal}`);
              } else {
                signaturePersonal = await getSignaturePersonal(
                  engine,
                  request,
                );
                logMessage(`Personal signature is ${signaturePersonal}`);
              }
              if (signaturePersonal) {
                paramArray.push(signaturePersonal);
              } else {
                throw new Error('Could not get personal signature while processing transaction in Mexa SDK. Please check the providers you have passed to Biconomy');
              }
            }

            const data = {
              from: account,
              apiId: api.id,
              params: paramArray,
              to,
              gasLimit,
            };

            if (signatureType && signatureType == engine.EIP712_SIGN) {
              data.signatureType = engine.EIP712_SIGN;
            }
            return {
              code: RESPONSE_CODES.SUCCESS_RESPONSE,
              message: 'Success',
              data: {
                account,
                api,
                data,
              },
            };
          }
          paramArray.push(...methodInfo.args);

          const data = {
            from: account,
            apiId: api.id,
            params: paramArray,
            gasLimit,
            to,
          };

          return {
            code: RESPONSE_CODES.SUCCESS_RESPONSE,
            message: 'Success',
            data: {
              account,
              api,
              data,
            },
          };
        }
        const error = formatMessage(
          RESPONSE_CODES.INVALID_OPERATION,
          'Biconomy smart contract wallets are not supported now. On dashboard, re-register your smart contract methods with "native meta tx" checkbox selected.',
        );
        return error;
      }
      if (engine.strictMode) {
        const error = formatMessage(
          RESPONSE_CODES.BICONOMY_NOT_INITIALIZED,
          'Decoders not initialized properly in mexa sdk. Make sure your have smart contracts registered on Mexa Dashboard',
        );
        return error;
      }
      logMessage(
        'Smart contract not found on dashbaord. Strict mode is off, so falling back to normal transaction mode',
      );
      return {
        code: 1, // call fallback
      };
    }
    const error = formatMessage(
      RESPONSE_CODES.INVALID_PAYLOAD,
      `Invalid payload data ${JSON.stringify(
        payload,
      )}. Expecting params key to be an array with first element having a 'to' property`,
    );
    return error;
  } catch (error) {
    return error;
  }
};
