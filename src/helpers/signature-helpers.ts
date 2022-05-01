import ethers from 'ethers';
import abi from 'ethereumjs-abi';
import { MetaApiType } from '../common/types';

let forwarderDomainType: any;
let forwardRequestType: any;
let forwarderDomainData: any;
let forwarderDomainDetails: {};

export function isEthersProvider(provider: any) {
  return ethers.providers.Provider.isProvider(provider);
}

export function getEIP712ForwardMessageToSign(
  request: any,
  forwarder: any,
  domainData: any,
) {
  // Update the verifyingContract field of domain data based on the current request
  if (
    !forwarderDomainType
    || !forwardRequestType
    || !forwarderDomainData
    || !forwarder
  ) {
    throw new Error('Biconomy is not properly initialized');
  }

  if (
    !forwarderDomainDetails
    || Object.keys(forwarderDomainDetails).length === 0
  ) {
    throw new Error('Biconomy is not properly initialized');
  }

  // Override domainData
  const domainDataToUse = domainData;
  // Might update version as well

  const dataToSign = JSON.stringify({
    types: {
      EIP712Domain: forwarderDomainType,
      ERC20ForwardRequest: forwardRequestType,
    },
    domain: domainDataToUse,
    primaryType: 'ERC20ForwardRequest',
    message: request,
  });
  return dataToSign;
}

export function getPersonalForwardMessageToSign(request: any) {
  return abi.soliditySHA3(
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
}

function getTargetProvider(engine: MetaApiType) {
  let provider;

  if (engine) {
    provider = engine.originalProvider;

    if (!engine.canSignMessages) {
      if (!engine.walletProvider) {
        // comment this out and just log
        // throw new Error(`Please pass a provider connected to a wallet that
        // can sign messages in Biconomy options.`);
        logMessage(
          `Please pass a provider connected to a wallet
        that can sign messages in Biconomy options`,
        );
      }

      provider = engine.walletProvider;
    }
  }

  return provider;
}

/**
 * Method to get the signature parameters.
 * @param signature String representing a signature
 * */
export function getSignatureParameters(signature: string): {
  r: string;
  s: string;
  v: number;
} {
  if (!ethers.utils.isHexString(signature)) {
    throw new Error(
      'Given value "'.concat(signature, '" is not a valid hex string.'),
    );
  }
  const r = signature.slice(0, 66);
  const s = '0x'.concat(signature.slice(66, 130));
  let v: string | number = '0x'.concat(signature.slice(130, 132));
  v = ethers.BigNumber.from(v).toNumber();
  if (![27, 28].includes(v)) v += 27;
  return {
    r,
    s,
    v,
  };
}

// take parameter for chosen signature type V3 or V4
export function getSignatureEIP712(
  engine: MetaApiType,
  account: any,
  request: any,
  forwarder: any,
  domainData: any,
  type: string,
) {
  // default V4 now
  let signTypedDataType = 'eth_signTypedData_v4';
  if (type === 'v3' || type === 'V3') {
    signTypedDataType = 'eth_signTypedData_v3';
  }
  const dataToSign = getEIP712ForwardMessageToSign(
    request,
    forwarder,
    domainData,
  );
  const targetProvider = getTargetProvider(engine);
  if (!targetProvider) {
    throw new Error('Unable to get provider information passed to Biconomy');
  }
  // eslint-disable-next-line no-async-promise-executor
  const promise = new Promise(async (resolve, reject) => {
    if (targetProvider) {
      if (isEthersProvider(targetProvider)) {
        try {
          const signature = await targetProvider.send(signTypedDataType, [
            account,
            dataToSign,
          ]);
          const { r, s, v } = getSignatureParameters(signature);
          const vNum = ethers.BigNumber.from(v).toHexString();
          const newSignature = r + s.slice(2) + vNum.slice(2);
          resolve(newSignature);
        } catch (error) {
          reject(error);
        }
      } else {
        await targetProvider.send(
          {
            jsonrpc: '2.0',
            id: 999999999999,
            method: signTypedDataType,
            params: [account, dataToSign],
          },
          (error: any, res: { result: any }) => {
            if (error) {
              reject(error);
            } else {
              const oldSignature = res.result;
              const { r, s, v } = getSignatureParameters(oldSignature);
              const vNum = ethers.BigNumber.from(v).toHexString();
              const newSignature = r + s.slice(2) + vNum.slice(2);
              resolve(newSignature);
            }
          },
        );
      }
    } else {
      const newLocal = 'Could not get signature from the provider passed to Biconomy. Check if you have passed a walletProvider in Biconomy Options.';
      reject(newLocal);
    }
  });

  return promise;
}

/**
 * Method to get the signature parameters.
 * @param engine Object containing the signer, walletprovider and originalprovider
 * @param request Object containing the request parameters
 * */
export async function getSignaturePersonal(engine: MetaApiType, request: any) {
  const hashToSign = getPersonalForwardMessageToSign(request);
  if (!engine.signer && !engine.walletProvider) {
    throw new Error(
      "Can't sign messages with current provider. Did you forget to pass walletProvider in Biconomy options?",
    );
  }
  let signature;
  const targetProvider = getTargetProvider(engine);

  if (!targetProvider) {
    throw new Error('Unable to get provider information passed to Biconomy');
  }

  let providerWithSigner;

  if (isEthersProvider(targetProvider)) {
    providerWithSigner = targetProvider;
  } else {
    providerWithSigner = new ethers.providers.Web3Provider(targetProvider);
  }

  const signer = providerWithSigner.getSigner();
  // eslint-disable-next-line no-async-promise-executor
  const promise = new Promise(async (resolve, reject) => {
    try {
      signature = await signer.signMessage(ethers.utils.arrayify(hashToSign));
      const { r, s, v } = getSignatureParameters(signature);
      const vNum = ethers.BigNumber.from(v).toHexString();
      const newSignature = r + s.slice(2) + vNum.slice(2);
      resolve(newSignature);
    } catch (error) {
      reject(error);
    }
  });
  return promise;
}