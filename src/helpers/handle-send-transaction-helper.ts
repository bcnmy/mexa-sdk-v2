import { ethers } from 'ethers';
import { HandleSendTransactionParamsType } from '../common/types';
import { config, RESPONSE_CODES } from '../config';
import { decodeMethod, formatMessage, logger } from '../utils';
import { buildForwardTxRequest, findTheRightForwarder, getDomainSeperator } from './meta-transaction-EIP2771-helpers';
import { getSignatureEIP712, getSignaturePersonal } from './signature-helpers';
import type { Biconomy } from '..';

const logMessage = logger.getLogger('handle-send-transaction-helper');

/**
  * Function decodes the parameter in payload and gets the user signature using eth_signTypedData_v4
  * method and send the request to biconomy for processing and call the callback method 'end'
  * with transaction hash.
  * This is an internal function that is called
  * while intercepting eth_sendTransaction RPC method call.
* */
export async function handleSendTransaction(
  this: Biconomy,
  handleSendTransactionParams: HandleSendTransactionParamsType,
) {
  try {
    const {
      method, params, fallback,
    } = handleSendTransactionParams;

    if (params && params[0] && params[0].to) {
      const to = params[0].to.toLowerCase();
      if (this.interfaceMap[to] || this.interfaceMap[config.SCW]) {
        let methodInfo = decodeMethod(to, params[0].data, this.interfaceMap);

        // Check if the Smart Contract Wallet is registered on dashboard
        if (!methodInfo) {
          methodInfo = decodeMethod(config.SCW, params[0].data, this.interfaceMap);
        }
        if (!methodInfo) {
          const error = {
            code: RESPONSE_CODES.WRONG_ABI,
            message: 'Can\'t decode method information from payload. Make sure you have uploaded correct ABI on Biconomy Dashboard',
          };
          return error;
        }
        const methodName = methodInfo.name;
        let api = this.dappApiMap[to]
          ? this.dappApiMap[to][methodName]
          : undefined;
          // Information we get here is contractAddress, methodName, methodType, ApiId
        let metaTxApproach;
        let customBatchId;
        let customDomainName; let
          customDomainVersion;
        let signTypedDataType;
        if (!api) {
          api = this.dappApiMap[config.SCW]
            ? this.dappApiMap[config.SCW][methodName]
            : undefined;
          metaTxApproach = this.smartContractMetaTransactionMap[config.SCW];
        } else {
          const contractAddress = api.contractAddress.toLowerCase();
          metaTxApproach = this.smartContractMetaTransactionMap[contractAddress];
        }

        // Sanitise gas limit here. big number / hex / number -> hex
        let gasLimit = params[0].gas || params[0].gasLimit;
        if (gasLimit) {
          gasLimit = ethers.BigNumber.from(gasLimit.toString()).toHexString();
        }
        let { txGas } = params[0];
        const { signatureType } = params[0];
        if (params[0].batchId) {
          customBatchId = Number(params[0].batchId);
        }

        if (params[0].domainName) {
          customDomainName = params[0].domainName;
        }

        if (params[0].domainVersion) {
          customDomainVersion = params[0].domainVersion;
        }

        if (params[0].signTypedDataType) {
          signTypedDataType = params[0].signTypedDataType;
        }

        logMessage.info(params[0]);
        logMessage.info(`gas limit : ${gasLimit}`);
        if (txGas) {
          logMessage.info(`tx gas supplied : ${txGas}`);
        }

        if (!api) {
          logMessage.info(`API not found for method ${methodName}`);
          logMessage.info(`Strict mode ${this.strictMode}`);
          if (this.strictMode) {
            const error = {
              code: RESPONSE_CODES.API_NOT_FOUND,
              message: `Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`,
            };
            return error;
          }
          logMessage.info(
            'Falling back to default provider as strict mode is false in biconomy',
          );
          return {
            code: 1, // call fallback
          };
        }
        logMessage.info('API found');

        logMessage.info('Getting user account');
        const account = payload.params[0].from;

        if (!account) {
          return {
            message: 'Not able to get user account',
          };
        }
        logMessage.info('User account fetched');

        logMessage.info(methodInfo.args);
        const paramArray = [];

        let forwardedData; let
          gasLimitNum;

        if (api.url === NATIVE_META_TX_URL) {
          if (metaTxApproach === this.TRUSTED_FORWARDER) {
            logMessage.info('Smart contract is configured to use Trusted Forwarder as meta transaction type');
            forwardedData = params[0].data;

            const signatureFromPayload = params[0].signature;
            // Check if txGas is present, if not calculate gas limit for txGas

            if (!txGas || parseInt(txGas, 10) === 0) {
              const contractAbi = this.smartContractMap[to];
              if (contractABI) {
                const contract = new ethers.Contract(
                  to,
                  JSON.parse(contractAbi),
                  this.ethersProvider,
                );
                txGas = await contract.estimateGas[methodInfo.signature](
                  ...methodInfo.args,
                  { from: account },
                );
                // do not send this value in API call. only meant for txGas
                gasLimitNum = ethers.BigNumber.from(txGas.toString())
                  .add(ethers.BigNumber.from(5000))
                  .toNumber();

                logMessage.info(`Gas limit (txGas) calculated for method ${methodName} in SDK: ${gasLimitNum}`);
              } else {
                const error = formatMessage(
                  RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND,
                  'Smart contract ABI not found!',
                );
                return error;
              }
            } else {
              logMessage.info(`txGas supplied for this Trusted Forwarder call is ${Number(txGas)}`);
              gasLimitNum = ethers.BigNumber.from(
                txGas.toString(),
              ).toNumber();
              logMessage.info(`gas limit number for txGas ${gasLimitNum}`);
            }

            // TODO
            // get the new smartContractTrustedForwarderMap and set it on the instance
            const forwarderToAttach = await findTheRightForwarder(this, to);

            const { request } = await buildForwardTxRequest(
              account,
              to,
              gasLimitNum, // txGas
              forwardedData,
              this.biconomyForwarder.attach(forwarderToAttach),
              customBatchId,
            );
            logMessage.info(JSON.stringify(request));

            paramArray.push(request);

            this.forwarderDomainData.verifyingContract = forwarderToAttach;
            const domainDataToUse = this.forwarderDomainDetails[forwarderToAttach];

            if (customDomainName) {
              domainDataToUse.name = customDomainName.toString();
            }

            if (customDomainVersion) {
              domainDataToUse.version = customDomainVersion.toString();
            }

            if (signatureType && signatureType === this.EIP712_SIGN) {
              logMessage.info('EIP712 signature flow');
              // Update the verifyingContract field of domain data based on the current request
              const domainSeparator = getDomainSeperator(
                domainDataToUse,
              );
              logMessage.info('Domain separator to be used:');
              logMessage.info(domainSeparator);
              paramArray.push(domainSeparator);
              let signatureEIP712;
              if (signatureFromPayload) {
                signatureEIP712 = signatureFromPayload;
                logMessage.info(`EIP712 signature from payload is ${signatureEIP712}`);
              } else {
                signatureEIP712 = await getSignatureEIP712(
                  this,
                  account,
                  request,
                  forwarderToAttach,
                  domainDataToUse,
                  signTypedDataType,
                );
                logMessage.info(`EIP712 signature is ${signatureEIP712}`);
              }
              paramArray.push(signatureEIP712);
            } else {
              logMessage.info('Personal signature flow');
              let signaturePersonal;
              if (signatureFromPayload) {
                signaturePersonal = signatureFromPayload;
                logMessage.info(`Personal signature from payload is ${signaturePersonal}`);
              } else {
                signaturePersonal = await getSignaturePersonal(
                  this,
                  request,
                );
                logMessage.info(`Personal signature is ${signaturePersonal}`);
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
              signatureType: signatureType && signatureType === this.EIP712_SIGN
                ? this.EIP712_SIGN : this.PERSONAL_SIGN,
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
      if (this.strictMode) {
        const error = formatMessage(
          RESPONSE_CODES.BICONOMY_NOT_INITIALIZED,
          'Decoders not initialized properly in mexa sdk. Make sure your have smart contracts registered on Mexa Dashboard',
        );
        return error;
      }
      logMessage.info(
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
}
