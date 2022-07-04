/* eslint-disable max-len */
// import ethers from 'ethers';
// import {
//   BiconomyWalletClientParamsType,
//   BuildExecTransactionParamsType,
//   CheckIfWalletExistsAndDeployParamsType,
//   CheckIfWalletExistsParamsType,
//   SendBiconomyWalletTransactionsParamsType,
// } from './common/biconomy-wallet-client-types';
// import {
//   baseWalletAbi,
//   walletFactoryAbi,
//   entryPointAbi,
// } from './abis';
// import {
//   config,
// } from './config';

// function getSignatureParameters(signature: string) {
//   if (!ethers.utils.isHexString(signature)) {
//     throw new Error(
//       'Given value "'.concat(signature, '" is not a valid hex string.'),
//     );
//   }
//   const r = signature.slice(0, 66);
//   const s = '0x'.concat(signature.slice(66, 130));
//   let v = '0x'.concat(signature.slice(130, 132));
//   v = ethers.BigNumber.from(v).toNumber();
//   if (![27, 28].includes(v)) v += 27;
//   return {
//     r,
//     s,
//     v,
//   };
// }

// /**
//  * Class to provide methods for biconomy wallet deployment,
//  *  signature building and sending the transaction
//  */
// export class BiconomyWalletClient {
//   engine;

//   biconomyAttributes;

//   isSignerWithAccounts;

//   provider;

//   targetProvider;

//   walletFactoryAddress;

//   baseWalletAddress;

//   entryPointAddress;

//   handlerAddress;

//   providerOrSigner;

//   networkId;

//   walletFactory;

//   baseWallet;

//   entryPoint;

//   constructor(biconomyWalletClientParams: BiconomyWalletClientParamsType) {
//     const {
//       biconomyProvider, // notice we passed engine (Biconomy) here
//       provider,
//       // Either we pass above both or target provider and use API calls to relay
//       targetProvider,
//       biconomyAttributes,
//       isSignerWithAccounts,
//       walletFactoryAddress,
//       baseWalletAddress,
//       entryPointAddress,
//       handlerAddress,
//       networkId,
//     } = biconomyWalletClientParams;
//     this.engine = biconomyProvider;
//     // Marked for removal
//     this.biconomyAttributes = biconomyAttributes;
//     this.isSignerWithAccounts = isSignerWithAccounts;
//     this.provider = provider;
//     this.targetProvider = targetProvider;
//     this.walletFactoryAddress = walletFactoryAddress;
//     this.baseWalletAddress = baseWalletAddress;
//     this.entryPointAddress = entryPointAddress;
//     this.handlerAddress = handlerAddress;

//     let providerOrSigner;
//     if (this.isSignerWithAccounts) {
//       providerOrSigner = this.provider.getSigner();
//     } else {
//       providerOrSigner = this.provider;
//     }
//     this.providerOrSigner = providerOrSigner;

//     this.networkId = networkId;

//     this.walletFactory = new ethers.Contract(
//       this.walletFactoryAddress,
//       walletFactoryAbi,
//       this.providerOrSigner,
//     );
//     this.baseWallet = new ethers.Contract(
//       this.baseWalletAddress,
//       baseWalletAbi,
//       this.providerOrSigner,
//     );
//     this.entryPoint = new ethers.Contract(
//       this.entryPointAddress,
//       entryPointAbi,
//       this.providerOrSigner,
//     );
//   }

//   async checkIfWalletExists(checkIfWalletExistsParams: CheckIfWalletExistsParamsType) {
//     const { eoa, index } = checkIfWalletExistsParams;
//     // Read calls would need providerOrSigner
//     const walletAddress = await this.walletFactory.getAddressForCounterfactualWallet(eoa, index);
//     const doesWalletExist = await this.walletFactory.isWalletExist(walletAddress);
//     if (doesWalletExist) {
//       return {
//         doesWalletExist,
//         walletAddress,
//       };
//     }
//     return {
//       doesWalletExist,
//       walletAddress: null,
//     };
//   }

//   async checkIfWalletExistsAndDeploy(
//     checkIfWalletExistsAndDeployParams: CheckIfWalletExistsAndDeployParamsType,
//   ) {
//     const { eoa, index } = checkIfWalletExistsAndDeployParams;
//     const walletAddress = await this.walletFactory.getAddressForCounterfactualWallet(eoa, index);
//     const doesWalletExist = await this.walletFactory.isWalletExist[walletAddress];
//     if (!doesWalletExist) {
//       await this.walletFactory.deployCounterFactualWallet(
//         eoa,
//         this.entryPointAddress,
//         this.handlerAddress,
//         index,
//       );
//     }
//     return walletAddress;
//   }

//   // Gasless transaction
//   // gasPrice and baseGas will always be zero
//   // we would add separate ERC20 (Forward) payment handlers in sdk
//   async buildExecTransaction(buildExecTransactionParams: BuildExecTransactionParamsType) {
//     const {
//       data, to, walletAddress, batchId = 0,
//     } = buildExecTransactionParams;
//     this.baseWallet = this.baseWallet.attach(walletAddress);

//     const nonce = await this.baseWallet.getNonce(batchId);
//     return {
//       to,
//       value: 0,
//       data,
//       operation: 0,
//       safeTxGas: 0,
//       baseGas: 0,
//       gasPrice: 0,
//       gasToken: config.ZERO_ADDRESS,
//       refundReceiver: config.ZERO_ADDRESS,
//       nonce,
//     };
//   }

//   async sendBiconomyWalletTransaction(
//     sendBiconomyWalletTransactionParams: SendBiconomyWalletTransactionsParamsType,
//   ) {
//     const {
//       execTransactionBody, walletAddress, signatureType,
//     } = sendBiconomyWalletTransactionParams;
//     let { signature } = sendBiconomyWalletTransactionParams;
//     if (!this.isSignerWithAccounts) {
//       if (!signature) {
//         throw new Error(
//           'Either pass signature param or pass a provider to Biconomy with user accounts information',
//         );
//       }
//     }

//     if (signature === null) {
//       if (signatureType === 'PERSONAL_SIGN') {
//         const transactionHash = await this.baseWallet.getTransactionHash(
//           execTransactionBody.to,
//           execTransactionBody.value,
//           execTransactionBody.data,
//           execTransactionBody.operation,
//           execTransactionBody.safeTxGas,
//           execTransactionBody.baseGas,
//           execTransactionBody.gasPrice,
//           execTransactionBody.gasToken,
//           execTransactionBody.refundReceiver,
//           execTransactionBody.nonce,
//         );
//         signature = await this.targetProvider.getSigner()
//           .signMessage(ethers.utils.arrayify(transactionHash));
//         const signatureParams = getSignatureParameters(signature);
//         let { v } = signatureParams;
//         const { r, s } = signatureParams;
//         v += 4;
//         v = ethers.BigNumber.from(v).toHexString();
//         signature = r + s.slice(2) + v.slice(2);
//       } else {
//         signature = await this.targetProvider.getSigner()._signTypedData(
//           { verifyingContract: walletAddress, chainId: this.networkId },
//           config.EIP712_SAFE_TX_TYPE,
//           execTransactionBody,
//         );
//       }
//     }

//     this.baseWallet = this.baseWallet.attach(walletAddress);
//     this.baseWallet = this.baseWallet.connect(this.engine.getSignerByAddress(walletAddress));

//     const tx = await this.baseWallet.execTransaction(
//       execTransactionBody.to,
//       execTransactionBody.value,
//       execTransactionBody.data,
//       execTransactionBody.operation,
//       execTransactionBody.safeTxGas,
//       execTransactionBody.baseGas,
//       execTransactionBody.gasPrice,
//       execTransactionBody.gasToken,
//       execTransactionBody.refundReceiver,
//       signature,
//     );
//     return tx;
//   }
// }
