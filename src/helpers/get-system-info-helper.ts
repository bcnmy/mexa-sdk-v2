import { ethers } from 'ethers';
import { DappDataForSystemInfoType, IBiconomy } from '../common/types';
import { config } from '../config';
import { logMessage } from '../utils';

import { biconomyForwarderAbi } from '../abis';

const domainData = {
  name: config.eip712DomainName,
  version: config.eip712SigVersion,
  verifyingContract: config.eip712VerifyingContract,
  chainId: 0,
};

export const getSystemInfo = async (
  engine: IBiconomy,
  dappDataForSystemInfo: DappDataForSystemInfoType,
) => {
  const { providerNetworkId, dappNetworkId } = dappDataForSystemInfo;

  logMessage(
    `Current provider network id: ${providerNetworkId}`,
  );

  if (providerNetworkId !== dappNetworkId) {
    return eventEmitter.emit(
      EVENTS.BICONOMY_ERROR,
      formatMessage(
        RESPONSE_CODES.NETWORK_ID_MISMATCH,
        `Current networkId ${providerNetworkId} is different from dapp network id registered on mexa dashboard ${dappNetworkId}`,
      ),
    );
  }
  domainData.chainId = providerNetworkId;
  fetch(
    `${baseURL}/api/${config.version2}/meta-tx/systemInfo?networkId=${providerNetworkId}`,
  )
    .then((response) => response.json())
    .then((systemInfo) => {
      if (systemInfo) {
        const {
          domainType, forwarderDomainType, metaInfoType, relayerPaymentType, metaTransactionType,
          loginDomainType, loginMessageType, loginDomainData, forwardRequestType,
          forwarderDomainData, forwarderDomainDetails, transferHandlerAddress,
          erc20ForwarderAddress,
        } = systemInfo;
        const trustedForwarderOverhead = systemInfo.overHeadEIP712Sign;
        const forwarderAddress = systemInfo.biconomyForwarderAddress;
        const forwarderAddresses = systemInfo.biconomyForwarderAddresses;

        const TRUSTED_FORWARDER = systemInfo.trustedForwarderMetaTransaction;
        const DEFAULT = systemInfo.defaultMetaTransaction;
        const EIP712_SIGN = systemInfo.eip712Sign;
        const PERSONAL_SIGN = systemInfo.personalSign;

        if (systemInfo.relayHubAddress) {
          domainData.verifyingContract = systemInfo.relayHubAddress;
        }

        if (forwarderAddress && forwarderAddress !== '') {
          const biconomyForwarder = new ethers.Contract(
            forwarderAddress,
            biconomyForwarderAbi,
            engine.ethersProvider,
          );
        }

        // Get dapps smart contract data from biconomy servers
        const getDAppInfoAPI = `${baseURL}/api/${config.version}/smart-contract`;
        fetch(getDAppInfoAPI, getFetchOptions('GET', apiKey))
          .then((response) => response.json())
          .then((result) => {
            if (!result && result.flag != 143) {
              return eventEmitter.emit(
                EVENTS.BICONOMY_ERROR,
                formatMessage(
                  RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND,
                  `Error getting smart contract for dappId ${dappId}`,
                ),
              );
            }
            const smartContractList = result.smartContracts;
            if (
              smartContractList
                && smartContractList.length > 0
            ) {
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
              _checkUserLogin(engine, dappId);
            } else if (engine.strictMode) {
              engine.status = STATUS.NO_DATA;
              eventEmitter.emit(
                EVENTS.BICONOMY_ERROR,
                formatMessage(
                  RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND,
                  `No smart contract registered for dappId ${dappId} on Mexa Dashboard`,
                ),
              );
            } else {
              _checkUserLogin(engine, dappId);
            }
          })
          .catch((error) => {
            eventEmitter.emit(
              EVENTS.BICONOMY_ERROR,
              formatMessage(
                RESPONSE_CODES.ERROR_RESPONSE,
                'Error while initializing Biconomy',
              ),
              error,
            );
          });
      } else {
        return eventEmitter.emit(
          EVENTS.BICONOMY_ERROR,
          formatMessage(
            RESPONSE_CODES.INVALID_DATA,
            'Could not get signature types from server. Contact Biconomy Team',
          ),
        );
      }
    });
};
