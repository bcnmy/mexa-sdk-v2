import { ethers } from 'ethers';
import { config, RESPONSE_CODES } from '../config';
import { formatMessage, getFetchOptions, logMessage } from '../utils';
import { biconomyForwarderAbi } from '../abis';

import type { Biconomy } from '..';
import { ContractMetaTransactionType } from '../common/types';

const domainData = {
  name: config.eip712DomainName,
  version: config.eip712SigVersion,
  verifyingContract: config.eip712VerifyingContract,
  chainId: 0,
};

const getDappInfo = async (dappId: string, strictMode: boolean) => {
  try {
    let smartContractMetaTransactionMap: any;
    let interfaceMap: any;
    let smartContractMap: any;
    const { getSmartContractsPerDappApiUrl } = config;
    fetch(getSmartContractsPerDappApiUrl, getFetchOptions('GET', dappId))
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
          smartContractList.forEach(
            (contract: {
              abi: string;
              type: string;
              metaTransactionType: any;
              address: string;
            }) => {
              const contractInterface = new ethers.utils.Interface(
                JSON.parse(contract.abi),
              );
              smartContractMetaTransactionMap[contract.address.toLowerCase()] = contract.metaTransactionType;
              interfaceMap[contract.address.toLowerCase()] = contractInterface;
              smartContractMap[contract.address.toLowerCase()] = contract.abi;
            },
          );
          logMessage.info(smartContractMetaTransactionMap);
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

// eslint-disable-next-line consistent-return
export async function getSystemInfo(this: Biconomy, providerNetworkId: number) {
  logMessage.info(`Current provider network id: ${providerNetworkId}`);

  if (!this.dappId) {
    return {
      error: 'dappid is undefined ',
      code: RESPONSE_CODES.DAPP_ID_UNDEFINED,
    };
  }
  const { dappId } = this;

  if (!this.dappId) {
    return {
      error: 'dappid is undefined ',
      code: RESPONSE_CODES.DAPP_ID_UNDEFINED,
    };
  }
  const { dappId } = this;

  if (providerNetworkId !== this.networkId) {
    const error = formatMessage(
      RESPONSE_CODES.NETWORK_ID_MISMATCH,
      `Current networkId ${providerNetworkId} is different from dapp network id registered on mexa dashboard ${this.networkId}`,
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
        this.forwarderDomainType = systemInfo.forwarderDomainType;
        // TODO metaInfoType, relayerPaymentType not there system info API on meta entry point
        // this.metaInfoType = systemInfo.metaInfoType;
        // this.relayerPaymentType = systemInfo.relayerPaymentType;
        // TODO metaTransactionType not there, adding
        // this.metaTransactionType = systemInfo.metaTransactionType;
        this.defaultMetaTransaction = ContractMetaTransactionType.DEFAULT;
        this.trustedForwarderMetaTransaction = ContractMetaTransactionType.EIP2771;
        this.forwardRequestType = systemInfo.forwardRequestType;
        this.forwarderDomainData = systemInfo.forwarderDomainData;
        this.forwarderDomainDetails = systemInfo.forwarderDomainDetails;
        this.forwarderAddress = systemInfo.biconomyForwarderAddress;
        this.forwarderAddresses = systemInfo.biconomyForwarderAddresses;
        this.eip712Sign = systemInfo.eip712Sign;
        this.personalSign = systemInfo.personalSign;

        // CHECK no value relayHubAddress in response of system infp
        // if (systemInfo.relayHubAddress) {
        //   domainData.verifyingContract = systemInfo.relayHubAddress;
        // }

        if (this.forwarderAddress && this.forwarderAddress !== '') {
          this.biconomyForwarder = new ethers.Contract(
            this.forwarderAddress,
            biconomyForwarderAbi,
            this.ethersProvider,
          );
        }

        const dappInfo = await getDappInfo(dappId, this.strictMode);

        if (dappInfo) {
          this.smartContractMap = dappInfo.smartContractMap;
          this.smartContractMetaTransactionMap = dappInfo.smartContractMetaTransactionMap;
          this.interfaceMap = dappInfo.interfaceMap;
        }
      }
      const error = formatMessage(
        RESPONSE_CODES.INVALID_DATA,
        'Could not get signature types from server. Contact Biconomy Team',
      );
      return error;
    });
}
