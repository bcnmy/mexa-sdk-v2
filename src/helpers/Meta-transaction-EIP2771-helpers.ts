import txDecoder from 'ethereum-tx-decoder';
import { ethers } from 'ethers';
import { eip2771BaseAbi } from '../abis';
import { config, RESPONSE_CODES } from '../config';
import { decodeMethod, formatMessage, logger } from '../utils';
import type { Biconomy } from '..';

const logMessage = logger.getLogger('app');

// TODO discuss if we are to expose
export const getForwardRequestAndMessageToSign = async (
  rawTransaction,
  tokenAddress,
  customBatchId,
  customDomainName,
  customDomainVersion,
  engine,
  interfaceMap,
  cb,
) => {
  try {
    return await new Promise((resolve, reject) => {
      if (rawTransaction) {
        const decodedTx = txDecoder.decodeTx(rawTransaction);
        if (decodedTx.to && decodedTx.data && decodedTx.value) {
          const to = decodedTx.to.toLowerCase();
          const methodInfo = decodeMethod(to, decodedTx.data, interfaceMap);
          if (!methodInfo) {
            const error = formatMessage(
              RESPONSE_CODES.DASHBOARD_DATA_MISMATCH,
              `Smart Contract address registered on dashboard is different than what is sent(${decodedTx.to}) in current transaction`,
            );
            if (cb) cb(error);

            return reject(error);
          }
          const methodName = methodInfo.name;
          // token address needs to be passed otherwise fees will be charged in DAI by default,
          // given DAI permit is given
          const token = tokenAddress || engine.daiTokenAddress;
          logMessage.info(tokenAddress);
          let api = engine.dappAPIMap[to]
            ? engine.dappAPIMap[to][methodName]
            : undefined;
          let metaTxApproach;
          if (!api) {
            api = engine.dappAPIMap[config.SCW]
              ? engine.dappAPIMap[config.SCW][methodName]
              : undefined;
            metaTxApproach = smartContractMetaTransactionMap[config.SCW];
          } else {
            const contractAddr = api.contractAddress.toLowerCase();
            metaTxApproach = smartContractMetaTransactionMap[contractAddr];
          }

          if (!api) {
            logMessage.info(`API not found for method ${methodName}`);
            const error = formatMessage(
              RESPONSE_CODES.API_NOT_FOUND,
              `No API found on dashboard for called method ${methodName}`,
            );
            if (cb) cb(error);
            return reject(error);
          }
          logMessage.info('API found');

          const parsedTransaction = ethers.utils.parseTransaction(rawTransaction);
          const account = parsedTransaction.from;

          logMessage.info(`Signer is ${account}`);
          let { gasLimit } = decodedTx;
          let gasLimitNum;

          if (!gasLimit || parseInt(gasLimit) == 0) {
            const contractABI = smartContractMap[to];
            if (contractABI) {
              const contract = new ethers.Contract(to, JSON.parse(contractABI), engine.ethersProvider);
              try {
                gasLimit = await contract.estimateGas[methodInfo.signature](...methodInfo.args, { from: account });
              } catch (err) {
                return reject(err);
              }
              // Do not send this value in API call. only meant for txGas
              gasLimitNum = ethers.BigNumber.from(gasLimit.toString())
                .add(ethers.BigNumber.from(5000))
                .toNumber();
              logMessage.info(`Gas limit number ${gasLimitNum}`);
            }
          } else {
            gasLimitNum = ethers.BigNumber.from(gasLimit.toString()).toNumber();
          }

          if (!account) {
            const error = formatMessage(
              RESPONSE_CODES.ERROR_RESPONSE,
              'Not able to get user account from signed transaction',
            );
            return end(error);
          }

          let request; let cost; let
            forwarderToUse;
          if (metaTxApproach == engine.TRUSTED_FORWARDER) {
            forwarderToUse = await findTheRightForwarder(engine, to);

            // Attach the forwarder with right address

            request = (
              await buildForwardTxRequest(
                account,
                to,
                gasLimitNum,
                decodedTx.data,
                biconomyForwarder.attach(forwarderToUse),
                customBatchId,
              )
            ).request;
          } else if (metaTxApproach == engine.ERC20_FORWARDER) {
            // token address needs to be passed otherwise fees will be charged in DAI by default, given DAI permit is given
            const buildTxResponse = await engine.erc20ForwarderClient.buildTx({
              userAddress: account,
              to,
              txGas: gasLimitNum,
              data: decodedTx.data,
              token,
            });
            if (buildTxResponse) {
              request = buildTxResponse.request;
              cost = buildTxResponse.cost;
            } else {
              reject(formatMessage(RESPONSE_CODES.ERROR_RESPONSE, 'Unable to build forwarder request'));
            }
          } else {
            const error = formatMessage(
              RESPONSE_CODES.INVALID_OPERATION,
              'Smart contract is not registered in the dashboard for this meta transaction approach. Kindly use biconomy.getUserMessageToSign',
            );
            if (cb) cb(error);
            return reject(error);
          }

          logMessage.info('Forward Request is: ');
          logMessage.info(request);

          // Update the verifyingContract field of domain data based on the current request
          forwarderDomainData.verifyingContract = forwarderToUse;
          const domainDataToUse = forwarderDomainDetails[forwarderToUse];

          if (customDomainName) {
            domainDataToUse.name = customDomainName.toString();
          }

          if (customDomainVersion) {
            domainDataToUse.version = customDomainVersion.toString();
          }

          const eip712DataToSign = {
            types: {
              EIP712Domain: forwarderDomainType,
              ERC20ForwardRequest: forwardRequestType,
            },
            domain: domainDataToUse,
            primaryType: 'ERC20ForwardRequest',
            message: request,
          };

          const hashToSign = abi.soliditySHA3(
            [
              'address',
              'address',
              'address',
              'uint256',
              'uint256',
              'uint256',
              'uint256',
              'uint256',
              'bytes32',
            ],
            [
              request.from,
              request.to,
              request.token,
              request.txGas,
              request.tokenGasPrice,
              request.batchId,
              request.batchNonce,
              request.deadline,
              ethers.utils.keccak256(request.data),
            ],
          );

          const dataToSign = {
            eip712Format: eip712DataToSign,
            personalSignatureFormat: hashToSign,
            request,
            cost,
          };

          if (cb) cb(null, dataToSign);

          return resolve(dataToSign);
        }
        const error = formatMessage(
          RESPONSE_CODES.BICONOMY_NOT_INITIALIZED,
          'Decoders not initialized properly in mexa sdk. Make sure your have smart contracts registered on Mexa Dashboard',
        );
        if (cb) cb(error);

        return reject(error);
      }
      return reject('rawtransaction object undefined');
    });
  } catch (error) {
    throw new Error(`Something went wrong in getForwardRequestAndMessageToSign(). Error message: ${JSON.stringify(error)}`);
  }
};

export const buildForwardTxRequest = async (
  account: string,
  to: string,
  gasLimitNum: number,
  data: any,
  biconomyForwarder: ethers.Contract,
  batchId = 0,
) => {
  if (!biconomyForwarder) {
    throw new Error('Biconomy Forwarder is not defined for current network');
  }
  const batchNonce = await biconomyForwarder.getNonce(account, batchId);
  const req = {
    from: account,
    to,
    token: config.ZERO_ADDRESS,
    txGas: gasLimitNum,
    tokenGasPrice: '0',
    batchId,
    batchNonce: parseInt(batchNonce, 10),
    deadline: Math.floor(Date.now() / 1000 + 3600),
    data,
  };
  return { request: req };
};

export const getDomainSeperator = (biconomyForwarderDomainData: any) => {
  const domainSeparator = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode([
    'bytes32',
    'bytes32',
    'bytes32',
    'address',
    'bytes32',
  ], [
    ethers.utils.id('EIP712Domain(string name,string version,address verifyingContract,bytes32 salt)'),
    ethers.utils.id(biconomyForwarderDomainData.name),
    ethers.utils.id(biconomyForwarderDomainData.version),
    biconomyForwarderDomainData.verifyingContract,
    biconomyForwarderDomainData.salt,
  ]));
  return domainSeparator;
};

export const findTheRightForwarder = async (engine: Biconomy, to: string) => {
  let forwarderToUse;
  let ethersProvider;
  if (engine.smartContractTrustedForwarderMap[to]) {
    forwarderToUse = engine.smartContractTrustedForwarderMap[to];
  } else {
    ethersProvider = engine.ethersProvider;
    const contract = new ethers.Contract(to, eip2771BaseAbi, ethersProvider);
    const supportedForwarders = engine.forwarderAddresses;
    forwarderToUse = engine.forwarderAddress; // default forwarder

    // Attempt to find out forwarder that 'to' contract trusts
    let forwarder;
    try {
      forwarder = await contract.trustedForwarder();
    } catch (error) {
      logMessage.error("Could not find read method 'trustedForwarder' in the contract abi");
      logMessage.error(JSON.stringify(error));
    }

    for (let i = 0; i < supportedForwarders.length; i += 1) {
      // Check if it matches above forwarder
      if (forwarder) {
        if (supportedForwarders[i].toString() === forwarder.toString()) {
          forwarderToUse = supportedForwarders[i];
          break;
        }
      }
      // Another way to find out is isTrustedForwarder read method
      try {
        // eslint-disable-next-line no-await-in-loop
        const isTrustedForwarder = await contract.isTrustedForwarder(supportedForwarders[i]);
        if (isTrustedForwarder) {
          forwarderToUse = supportedForwarders[i];
          break;
        }
      } catch (error) {
        logMessage.error("Could not find read method 'isTrustedForwarder' in the contract abi");
        logMessage.error(JSON.stringify(error));
      }
    }
  }
  return forwarderToUse;
};
