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
    const { getSmartContractsPerDappApiUrl } = config;
    fetch(getSmartContractsPerDappApiUrl, getFetchOptions('GET', apiKey))
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
  _engine: IBiconomy,
  dappDataForSystemInfo: DappDataForSystemInfoType,
) => {
  const {
    providerNetworkId, dappNetworkId, dappId, apiKey, strictMode,
  } = dappDataForSystemInfo;
  const engine = _engine;

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
        engine.domainType = systemInfo.domainType;
        engine.forwarderDomainType = systemInfo.forwarderDomainType;
        engine.metaInfoType = systemInfo.metaInfoType;
        engine.relayerPaymentType = systemInfo.relayerPaymentType;
        engine.metaTransactionType = systemInfo.metaTransactionType;
        engine.loginDomainType = systemInfo.loginDomainType;
        engine.loginMessageType = systemInfo.loginMessageType;
        engine.loginDomainData = systemInfo.loginDomainData;
        engine.forwardRequestType = systemInfo.forwardRequestType;
        engine.forwarderDomainData = systemInfo.forwarderDomainData;
        engine.forwarderDomainDetails = systemInfo.forwarderDomainDetails;
        engine.trustedForwarderOverhead = systemInfo.overHeadEIP712Sign;
        engine.forwarderAddress = systemInfo.biconomyForwarderAddress;
        engine.forwarderAddresses = systemInfo.biconomyForwarderAddresses;
        engine.TRUSTED_FORWARDER = systemInfo.trustedForwarderMetaTransaction;
        engine.DEFAULT = systemInfo.defaultMetaTransaction;
        engine.EIP712_SIGN = systemInfo.eip712Sign;
        engine.PERSONAL_SIGN = systemInfo.personalSign;

        if (systemInfo.relayHubAddress) {
          domainData.verifyingContract = systemInfo.relayHubAddress;
        }

        if (engine.forwarderAddress && engine.forwarderAddress !== '') {
          engine.biconomyForwarder = new ethers.Contract(
            engine.forwarderAddress,
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
          engine.smartContractMap = dappInfo.smartContractMap;
          engine.smartContractMetaTransactionMap = dappInfo.smartContractMetaTransactionMap;
          engine.interfaceMap = dappInfo.interfaceMap;
        }
      }
      const error = formatMessage(
        RESPONSE_CODES.INVALID_DATA,
        'Could not get signature types from server. Contact Biconomy Team',
      );
      return error;
    });

  return {
    code: RESPONSE_CODES.SUCCESS_RESPONSE,
    message: 'Success',
    engine,
  };
};
