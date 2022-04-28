import { ethers } from 'ethers';
import { DappDataForSystemInfoType, IBiconomy } from '../common/types';
import {
  config, RESPONSE_CODES,
} from '../config';
import { formatMessage, getFetchOptions, logMessage } from '../utils';

import { biconomyForwarderAbi } from '../abis';

const domainData = {
  name: config.eip712DomainName,
  version: config.eip712SigVersion,
  verifyingContract: config.eip712VerifyingContract,
  chainId: 0,
};

const getDAppInfo = async (
  apiKey: string,
  dappId: string,
  strictMode: boolean,
) => {
  try {
    let smartContractMetaTransactionMap: any; let interfaceMap: any; let smartContractMap: any;
    const getDAppInfoAPI = `${config.dashboardBackenUrl}/api/v1/smart-contract`;
    fetch(getDAppInfoAPI, getFetchOptions('GET', apiKey))
      .then((response) => response.json())
      // eslint-disable-next-line consistent-return
      .then((result) => {
        if (!result && result.flag !== 200) {
          const error = formatMessage(
            RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND,
            `Error getting smart contract for dappId ${dappId}`,
          );
          return error;
        }
        const smartContractList = result.smartContracts;
        if (smartContractList && smartContractList.length > 0) {
          smartContractList.forEach((contract: {
            abi: string;
            type: string;
            metaTransactionType: any;
            address: string;
          }) => {
            const contractInterface = new ethers.utils.Interface(JSON.parse(contract.abi));
            if (contract.type === config.SCW) {
              smartContractMetaTransactionMap[config.SCW] = contract.metaTransactionType;
              interfaceMap[config.SCW] = contractInterface;
              smartContractMap[config.SCW] = contract.abi;
            } else {
              smartContractMetaTransactionMap[
                contract.address.toLowerCase()
              ] = contract.metaTransactionType;
              interfaceMap[
                contract.address.toLowerCase()
              ] = contractInterface;
              smartContractMap[
                contract.address.toLowerCase()
              ] = contract.abi;
            }
          });
          logMessage(smartContractMetaTransactionMap);
          // _checkUserLogin(engine, dappId);
        } else if (strictMode) {
          const error = formatMessage(
            RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND,
            `No smart contract registered for dappId ${dappId} on Mexa Dashboard`,
          );
          return error;
        }
      })
      .catch((error) => error);
    return {
      smartContractMetaTransactionMap,
      interfaceMap,
      smartContractMap,
    };
  } catch (error) {
    return {
      code: RESPONSE_CODES.DAPP_NOT_FOUND,
      error: JSON.stringify(error),
    };
  }
};

export const getSystemInfo = async (
  engine: IBiconomy,
  dappDataForSystemInfo: DappDataForSystemInfoType,
) => {
  const {
    providerNetworkId, dappNetworkId, dappId, apiKey, strictMode,
  } = dappDataForSystemInfo;

  let domainType; let forwarderDomainType; let metaInfoType;
  let relayerPaymentType; let metaTransactionType;
  let loginDomainType; let loginMessageType; let loginDomainData;
  let forwardRequestType; let forwarderDomainData; let forwarderDomainDetails;
  let trustedForwarderOverhead; let forwarderAddress; let forwarderAddresses;
  let TRUSTED_FORWARDER; let DEFAULT; let EIP712_SIGN; let PERSONAL_SIGN;
  let biconomyForwarder: any;
  let smartContractMetaTransactionMap: any; let interfaceMap: any; let smartContractMap: any;

  logMessage(
    `Current provider network id: ${providerNetworkId}`,
  );

  if (providerNetworkId !== dappNetworkId) {
    const error = formatMessage(
      RESPONSE_CODES.NETWORK_ID_MISMATCH,
      `Current networkId ${providerNetworkId} is different from dapp network id registered on mexa dashboard ${dappNetworkId}`,
    );
    return error;
  }
  domainData.chainId = providerNetworkId;
  fetch(
    `${config.metaEntryPointBaseUrl}/api/systemInfo/?networkId=${providerNetworkId}`,
  )
    .then((response) => response.json())
    .then(async (systemInfo) => {
      if (systemInfo) {
        domainType = systemInfo.domainType;
        forwarderDomainType = systemInfo.forwarderDomainType;
        metaInfoType = systemInfo.metaInfoType;
        relayerPaymentType = systemInfo.relayerPaymentType;
        metaTransactionType = systemInfo.metaTransactionType;
        loginDomainType = systemInfo.loginDomainType;
        loginMessageType = systemInfo.loginMessageType;
        loginDomainData = systemInfo.loginDomainData;
        forwardRequestType = systemInfo.forwardRequestType;
        forwarderDomainData = systemInfo.forwarderDomainData;
        forwarderDomainDetails = systemInfo.forwarderDomainDetails;
        trustedForwarderOverhead = systemInfo.overHeadEIP712Sign;
        forwarderAddress = systemInfo.biconomyForwarderAddress;
        forwarderAddresses = systemInfo.biconomyForwarderAddresses;
        TRUSTED_FORWARDER = systemInfo.trustedForwarderMetaTransaction;
        DEFAULT = systemInfo.defaultMetaTransaction;
        EIP712_SIGN = systemInfo.eip712Sign;
        PERSONAL_SIGN = systemInfo.personalSign;

        if (systemInfo.relayHubAddress) {
          domainData.verifyingContract = systemInfo.relayHubAddress;
        }

        if (forwarderAddress && forwarderAddress !== '') {
          biconomyForwarder = new ethers.Contract(
            forwarderAddress,
            biconomyForwarderAbi,
            engine.ethersProvider,
          );
        }

        const dappInfo = await getDAppInfo(
          apiKey,
          dappId,
          strictMode,
        );

        if (dappInfo) {
          smartContractMap = dappInfo.smartContractMap;
          smartContractMetaTransactionMap = dappInfo.smartContractMetaTransactionMap;
          interfaceMap = dappInfo.interfaceMap;
        }

        return {
          code: RESPONSE_CODES.SUCCESS_RESPONSE,
          message: 'Success',
          data: {
            domainType,
            forwarderDomainType,
            metaInfoType,
            relayerPaymentType,
            metaTransactionType,
            loginDomainType,
            loginMessageType,
            loginDomainData,
            forwardRequestType,
            forwarderDomainData,
            forwarderDomainDetails,
            trustedForwarderOverhead,
            forwarderAddress,
            forwarderAddresses,
            TRUSTED_FORWARDER,
            DEFAULT,
            EIP712_SIGN,
            PERSONAL_SIGN,
            biconomyForwarder,
            smartContractMetaTransactionMap,
            interfaceMap,
            smartContractMap,
          },
        };
      }
      const error = formatMessage(
        RESPONSE_CODES.INVALID_DATA,
        'Could not get signature types from server. Contact Biconomy Team',
      );
      return error;
    });
};
