/* eslint-disable consistent-return */
import { ethers } from 'ethers';
import { get } from 'request-promise';
import {
  config, RESPONSE_CODES,
} from '../config';
import { formatMessage, logMessage } from '../utils';

import { biconomyForwarderAbi } from '../abis';
import type { Biconomy } from '..';
import { ContractMetaTransactionType } from '../common/types';

const domainData = {
  name: config.eip712DomainName,
  version: config.eip712SigVersion,
  verifyingContract: config.eip712VerifyingContract,
  chainId: 0,
};

const getDappInfo = async (
  dappId: string,
  strictMode: boolean,
  apiKey: string,
) => {
  try {
    let smartContractMetaTransactionMap: any; let interfaceMap: any; let smartContractMap: any;
    const { getSmartContractsPerDappApiUrl } = config;
    console.log('Sending request to get smart contracts');
    const options = {
      uri: `${getSmartContractsPerDappApiUrl}/${dappId}`,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json;charset=utf-8',
      },
    };

    get(options)
      .then((result) => {
        console.log(result);
        const smartContractResult = JSON.parse(result);
        const smartContractList = smartContractResult.data.smartContracts;
        console.log('smartContractList', smartContractList);
        if (smartContractList && smartContractList.length > 0) {
          smartContractList.forEach((contract: {
            abi: string;
            type: string;
            metaTransactionType: any;
            address: string;
          }) => {
            console.log(contract);
            const contractInterface = new ethers.utils.Interface(JSON.parse(contract.abi));
            console.log('contractInterface', contractInterface);
            smartContractMetaTransactionMap[
              contract.address.toLowerCase()
            ] = contract.metaTransactionType;
            interfaceMap[
              contract.address.toLowerCase()
            ] = contractInterface;
            smartContractMap[
              contract.address.toLowerCase()
            ] = contract.abi;
          });
          console.log(smartContractMetaTransactionMap);
          console.log(interfaceMap);
          console.log(smartContractMap);
          // _checkUserLogin(engine, dappId);
        } else if (strictMode) {
          const error = formatMessage(
            RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND,
            `No smart contract registered for dappId ${dappId} on Mexa Dashboard`,
          );
          return error;
        }
      })
      .catch((error) => console.log(error));
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
export async function getSystemInfo(
  this: Biconomy,
  providerNetworkId: number,
) {
  console.log(
    `Current provider network id: ${providerNetworkId}`,
  );

  if (!this.dappId) {
    return {
      error: 'dappId is undefined ',
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

  const dappInfo = await getDappInfo(
    dappId,
    this.strictMode,
    this.apiKey,
  );

  if (dappInfo) {
    this.smartContractMap = dappInfo.smartContractMap;
    this.smartContractMetaTransactionMap = dappInfo.smartContractMetaTransactionMap;
    this.interfaceMap = dappInfo.interfaceMap;
  }
  console.log('smartContractMap', this.smartContractMap);
  console.log('smartContractMetaTransactionMap', this.smartContractMetaTransactionMap);
  console.log('interfaceMap', this.interfaceMap);

  domainData.chainId = providerNetworkId;
  const options = {
    uri: `${config.metaEntryPointBaseUrl}/api/v2/meta-tx/systemInfo/?networkId=${providerNetworkId}`,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
    },
  };
  get(options)
    // .then((response) => response.json())
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
      }
      const error = formatMessage(
        RESPONSE_CODES.INVALID_DATA,
        'Could not get signature types from server. Contact Biconomy Team',
      );
      return error;
    });
}
