/* eslint-disable consistent-return */
import txDecoder from 'ethereum-tx-decoder';
import { ethers } from 'ethers';
import type { Biconomy } from '..';
import { SendSingedTransactionParamsType } from '../common/types';
import { config, RESPONSE_CODES } from '../config';
import { decodeMethod, formatMessage, logMessage } from '../utils';
import {
  findTheRightForwarder,
  getDomainSeperator,
} from './meta-transaction-EIP2771-helpers';
import { sendTransaction } from './send-transaction-helper';

/**
 * Method used to handle transaction initiated using web3.eth.sendSignedTransaction method
 * It extracts rawTransaction from payload and decode it to get required information like from, to,
 * data, gasLimit to create the payload for biconomy meta transaction API.
 * In case of Native meta transaction, payload just contains rawTransaction
 * In case of contract based meta transaction, payload contains rawTransaction and signature wrapped
 * in a json object.
 *
 * @param {Object} this Reference to this SDK instance
 * @param {Object} payload Payload data
 */
export async function sendSignedTransaction(
  this: Biconomy,
  sendSignedTransactionParams: SendSingedTransactionParamsType,
) {
  if (!this.interfaceMap) {
    return {
      error: 'Interface Map is undefined',
      code: RESPONSE_CODES.INTERFACE_MAP_UNDEFINED,
    };
  }

  if (!this.dappApiMap) {
    return {
      error: 'Dapp Api Map is undefined',
      code: RESPONSE_CODES.DAPP_API_MAP_UNDEFINED,
    };
  }

  if (!this.smartContractMetaTransactionMap) {
    return {
      error: 'Smart contract meta transaction map is undefined',
      code: RESPONSE_CODES.SMART_CONTRACT_METATRANSACTION_MAP_UNDEFINED,
    };
  }

  if (!this.smartContractMap) {
    return {
      error: 'Smart contract map is undefined',
      code: RESPONSE_CODES.SMART_CONTRACT_MAP_UNDEFINED,
    };
  }

  if (!this.smartContractTrustedForwarderMap) {
    return {
      error: 'Smart contract trusted forwarder map is undefined',
      code: RESPONSE_CODES.SMART_CONTRACT_TRSUTED_FORWARDER_MAP_UNDEFINED,
    };
  }

  if (!this.forwarderDomainData) {
    return {
      error: 'Forwarder domain data is undefined',
      code: RESPONSE_CODES.FORWARDER_DOMAIN_DATA_UNDEFINED,
    };
  }

  if (!this.forwarderDomainDetails) {
    return {
      error: 'Forwarder domain details is undefined',
      code: RESPONSE_CODES.FORWARDER_DOMAIN_DETAILS_UNDEFINED,
    };
  }

  if (!this.forwarderAddresses) {
    return {
      error: 'Forwarder Addresses array is undefined',
      code: RESPONSE_CODES.FORWARDER_ADDRESSES_ARRAY_UNDEFINED,
    };
  }

  if (!this.forwarderAddress) {
    return {
      error: 'Forwarder Address is undefined',
      code: RESPONSE_CODES.FORWARDER_ADDRESS_UNDEFINED,
    };
  }

  let { params, fallback } = sendSignedTransactionParams;
  if (params && params[0]) {
    const data = params[0];
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
        let methodInfo = decodeMethod(to, decodedTx.data, this.interfaceMap);
        if (!methodInfo) {
          methodInfo = decodeMethod(
            config.SCW,
            decodedTx.data,
            this.interfaceMap,
          );
          if (!methodInfo) {
            if (this.strictMode) {
              const error = formatMessage(
                RESPONSE_CODES.DASHBOARD_DATA_MISMATCH,
                `No smart contract wallet or smart contract registered on dashboard with address (${decodedTx.to})`,
              );
              return error;
            }
            logMessage.info(
              'Strict mode is off so falling back to default provider for handling transaction',
            );
            if (typeof data === 'object' && data.rawTransaction) {
              params = [data.rawTransaction];
            }
          }
        }
        const methodName = methodInfo.name;
        let api = this.dappApiMap[to]
          ? this.dappApiMap[to][methodName]
          : undefined;
        let metaTxApproach;
        if (!api) {
          api = this.dappApiMap[config.SCW]
            ? this.dappApiMap[config.SCW][methodName]
            : undefined;
          metaTxApproach = this.smartContractMetaTransactionMap[config.SCW];
        } else {
          const contractAddr = api.contractAddress.toLowerCase();
          metaTxApproach = this.smartContractMetaTransactionMap[contractAddr];
        }
        if (!api) {
          logMessage.info(`API not found for method ${methodName}`);
          logMessage.info(`Strict mode ${this.strictMode}`);
          if (this.strictMode) {
            const error = formatMessage(
              RESPONSE_CODES.API_NOT_FOUND,
              `Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`,
            );
            return error;
          }
          logMessage.info(
            'Falling back to default provider as strict mode is false in biconomy',
          );
          if (typeof data === 'object' && data.rawTransaction) {
            params = [data.rawTransaction];
          }
        }
        logMessage.info('API found');
        const paramArray = [];
        const parsedTransaction = ethers.utils.parseTransaction(rawTransaction);
        const account = parsedTransaction ? parsedTransaction.from : undefined;

        logMessage.info(`signer is ${account}`);
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
        let gasLimitNum;
        let { gasLimit } = decodedTx;
        if (metaTxApproach !== this.defaultMetaTransaction) {
          if (!gasLimit || parseInt(gasLimit, 10) === 0) {
            const contractABI = this.smartContractMap[to];
            if (contractABI) {
              const contract = new ethers.Contract(
                to,
                contractABI,
                this.readOnlyProvider
                  ? this.readOnlyProvider
                  : this.ethersProvider,
              );
              gasLimit = await contract.estimateGas[methodInfo.signature](
                ...methodInfo.args,
                { from: account },
              );

              // do not send this value in API call. only meant for txGas
              gasLimitNum = ethers.BigNumber.from(gasLimit.toString())
                .add(ethers.BigNumber.from(5000))
                .toNumber();
              logMessage.info(`gas limit number${gasLimitNum}`);
            }
          } else {
            gasLimitNum = ethers.BigNumber.from(gasLimit.toString()).toNumber();
          }
          logMessage.info(request);

          paramArray.push(request);

          const forwarderToUse = await findTheRightForwarder({
            to,
            smartContractTrustedForwarderMap: this.smartContractTrustedForwarderMap,
            provider: this.readOnlyProvider ? this.readOnlyProvider : this.ethersProvider,
            forwarderAddresses: this.forwarderAddresses,
            forwarderAddress: this.forwarderAddress,
          });
          this.smartContractTrustedForwarderMap[to] = forwarderToUse;

          // Update the verifyingContract in domain data
          this.forwarderDomainData.verifyingContract = forwarderToUse;
          const domainDataToUse = this.forwarderDomainDetails[parseInt(forwarderToUse, 10)];

          if (customDomainName) {
            domainDataToUse.name = customDomainName.toString();
          }

          if (customDomainVersion) {
            domainDataToUse.version = customDomainVersion.toString();
          }

          // Update the verifyingContract field of domain data based on the current request
          if (signatureType && signatureType === this.eip712Sign) {
            const domainSeparator = getDomainSeperator(domainDataToUse);
            logMessage.info(domainSeparator);
            paramArray.push(domainSeparator);
          }

          paramArray.push(signature);

          const trustedForwarderMetaTransactionData = {
            from: account,
            apiId: api?.apiId,
            params: paramArray,
            to,
            signatureType: signatureType ? this.eip712Sign : this.personalSign,
          };
          await sendTransaction(
            this,
            account,
            trustedForwarderMetaTransactionData,
          );
        }
        paramArray.push(...methodInfo.args);

        const defaultMetaTransactionData = {
          from: account,
          apiId: api?.apiId,
          params: paramArray,
          gasLimit: decodedTx.gasLimit.toString(), // verify
          to: decodedTx.to.toLowerCase(),
        };

        await sendTransaction(this, account, defaultMetaTransactionData);
      } else {
        const error = formatMessage(
          RESPONSE_CODES.INVALID_PAYLOAD,
          'Not able to deode the data in rawTransaction using ethereum-tx-decoder. Please check the data sent.',
        );
        return error;
      }
    } else {
      const error = formatMessage(
        RESPONSE_CODES.INVALID_PAYLOAD,
        `Invalid payload data ${JSON.stringify(
          params[0],
        )}.rawTransaction is required in param object`,
      );
      return error;
    }
  } else {
    const error = formatMessage(
      RESPONSE_CODES.INVALID_PAYLOAD,
      `Invalid payload data ${JSON.stringify(
        params,
      )}. Non empty Array expected in params key`,
    );
    return error;
  }
}
