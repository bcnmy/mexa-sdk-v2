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

// eslint-disable-next-line consistent-return
export async function getSystemInfo(
  this: Biconomy,
  providerNetworkId: number,
) {
  domainData.chainId = providerNetworkId;
  const options = {
    // TODO
    // Review Uri backwards compatibility
    uri: `${config.metaEntryPointBaseUrl}/api/v1/systemInfo/?networkId=${providerNetworkId}`,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
    },
  };
  get(options)
    .then(async (response) => {
      const result = JSON.parse(response);
      if (result.response.code === '200' && result.response.data) {
        const systemInfo = result.response.data;
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
      }
      const error = formatMessage(
        RESPONSE_CODES.INVALID_DATA,
        'Could not get signature types from server. Contact Biconomy Team',
      );
      return error;
    });
}
