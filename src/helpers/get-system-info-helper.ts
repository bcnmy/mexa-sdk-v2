/* eslint-disable consistent-return */
import { ethers } from 'ethers';
import axios from 'axios';
import {
  config,
} from '../config';
// import { formatMessage, logMessage } from '../utils';

import { biconomyForwarderAbi } from '../abis';
import type { Biconomy } from '..';
import { ContractMetaTransactionType, SystemInfoResponse } from '../common/types';

const domainData = {
  name: config.eip712DomainName,
  version: config.eip712SigVersion,
  verifyingContract: config.eip712VerifyingContract,
  chainId: 0,
};

export async function getSystemInfo(
  this: Biconomy,
  providerNetworkId: number,
) {
  domainData.chainId = providerNetworkId;
  const response: SystemInfoResponse = await axios.get(
    `${config.metaEntryPointBaseUrl}/api/v1/systemInfo/?networkId=${providerNetworkId}`,
    {
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
    },
  );
  const systemInfoResponse = response.data.response;
  if (systemInfoResponse.code === '200' && systemInfoResponse.data) {
    const systemInfo = systemInfoResponse.data;
    this.forwarderDomainType = systemInfo.forwarderDomainType;
    this.defaultMetaTransaction = ContractMetaTransactionType.DEFAULT;
    this.trustedForwarderMetaTransaction = ContractMetaTransactionType.EIP2771;
    this.forwardRequestType = systemInfo.forwardRequestType;
    this.forwarderDomainData = systemInfo.forwarderDomainData;
    this.forwarderDomainDetails = systemInfo.forwarderDomainDetails;
    this.forwarderAddress = systemInfo.biconomyForwarderAddress;
    this.forwarderAddresses = systemInfo.biconomyForwarderAddresses;
    this.eip712Sign = systemInfo.eip712Sign;
    this.personalSign = systemInfo.personalSign;

    if (this.forwarderAddress && this.forwarderAddress !== '') {
      this.biconomyForwarder = new ethers.Contract(
        this.forwarderAddress,
        biconomyForwarderAbi,
        this.ethersProvider,
      );
    }
  } else {
    throw new Error('System info API call failed');
  }
}
