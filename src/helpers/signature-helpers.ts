import { ethers } from 'ethers';
import abi from 'ethereumjs-abi';
import type { Biconomy } from '..';

/**
 * Method to get the signature parameters.
 * @param signature String representing a signature
 * */
export const getSignatureParameters = (signature: string) => {
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
};

export const getEIP712ForwardMessageToSign = async (
  engine: Biconomy,
  request: any,
  forwarder: any,
  domainData: any,
) => {
  if (
    !engine.forwarderDomainDetails
      || Object.keys(engine.forwarderDomainDetails).length === 0
  ) {
    throw new Error('Biconomy is not properly initialized');
  }

  // Override domainData
  const domainDataToUse = domainData;
  // Might update version as well

  const dataToSign = JSON.stringify({
    types: {
      EIP712Domain: engine.forwarderDomainType,
      ERC20ForwardRequest: engine.forwardRequestType,
    },
    domain: domainDataToUse,
    primaryType: 'ERC20ForwardRequest',
    message: request,
  });
  return dataToSign;
};

// take parameter for chosen signature type V3 or V4
export const getSignatureEIP712 = async (
  engine: Biconomy,
  account: any,
  request: any,
  forwarder: any,
  domainData: any,
  type: string,
) => {
  // default V4 now
  let signTypedDataType = 'eth_signTypedData_v4';
  if (type === 'v3' || type === 'V3') {
    signTypedDataType = 'eth_signTypedData_v3';
  }
  const dataToSign = getEIP712ForwardMessageToSign(
    engine,
    request,
    forwarder,
    domainData,
  );

  const { ethersProvider } = engine;
  try {
    const signature = await ethersProvider.send(signTypedDataType, [
      account,
      dataToSign,
    ]);
    const { r, s, v } = getSignatureParameters(signature);
    const vNum = ethers.BigNumber.from(v).toHexString();
    const newSignature = r + s.slice(2) + vNum.slice(2);
    return newSignature;
  } catch (error) {
    return '';
  }
};

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

/**
 * Method to get the signature parameters.
 * @param engine Object containing the signer, walletprovider and originalprovider
 * @param request Object containing the request parameters
 * */
export const getSignaturePersonal = (engine: Biconomy, request: any) => {
  const hashToSign = getPersonalForwardMessageToSign(request);
  let signature;

  const { signer } = engine;
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
};
