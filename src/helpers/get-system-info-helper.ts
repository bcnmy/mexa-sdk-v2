import { ethers } from 'ethers';
import { config, RESPONSE_CODES } from '../config';
import { formatMessage, getFetchOptions, logger } from '../utils';
import { biconomyForwarderAbi } from '../abis';
import type { Biconomy } from '..';

const logMessage = logger.getLogger('app');

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
              if (contract.type === config.SCW) {
                smartContractMetaTransactionMap[config.SCW] = contract.metaTransactionType;
                interfaceMap[config.SCW] = contractInterface;
                smartContractMap[config.SCW] = contract.abi;
              } else {
                smartContractMetaTransactionMap[
                  contract.address.toLowerCase()
                ] = contract.metaTransactionType;
                interfaceMap[contract.address.toLowerCase()] = contractInterface;
                smartContractMap[contract.address.toLowerCase()] = contract.abi;
              }
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

export async function getSystemInfo(this: Biconomy, providerNetworkId: number) {
  logMessage.info(`Current provider network id: ${providerNetworkId}`);

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
        this.domainType = systemInfo.domainType;
        this.forwarderDomainType = systemInfo.forwarderDomainType;
        this.metaInfoType = systemInfo.metaInfoType;
        this.relayerPaymentType = systemInfo.relayerPaymentType;
        this.metaTransactionType = systemInfo.metaTransactionType;
        this.loginDomainType = systemInfo.loginDomainType;
        this.loginMessageType = systemInfo.loginMessageType;
        this.loginDomainData = systemInfo.loginDomainData;
        this.forwardRequestType = systemInfo.forwardRequestType;
        this.forwarderDomainData = systemInfo.forwarderDomainData;
        this.forwarderDomainDetails = systemInfo.forwarderDomainDetails;
        this.trustedForwarderOverhead = systemInfo.overHeadEIP712Sign;
        this.forwarderAddress = systemInfo.biconomyForwarderAddress;
        this.forwarderAddresses = systemInfo.biconomyForwarderAddresses;
        this.TRUSTED_FORWARDER = systemInfo.trustedForwarderMetaTransaction;
        this.DEFAULT = systemInfo.defaultMetaTransaction;
        this.EIP712_SIGN = systemInfo.eip712Sign;
        this.PERSONAL_SIGN = systemInfo.personalSign;

        if (systemInfo.relayHubAddress) {
          domainData.verifyingContract = systemInfo.relayHubAddress;
        }

        if (this.forwarderAddress && this.forwarderAddress !== '') {
          this.biconomyForwarder = new ethers.Contract(
            this.forwarderAddress,
            biconomyForwarderAbi,
            this.ethersProvider,
          );
        }

        const dappInfo = await getDsppInfo(this.dappId, this.strictMode);

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
