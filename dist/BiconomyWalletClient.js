"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiconomyWalletClient = void 0;
/* eslint-disable max-len */
const ethers_1 = __importDefault(require("ethers"));
const abis_1 = require("./abis");
const config_1 = require("./config");
const utils_1 = require("./utils");
const getSignatureParameters = (signature) => {
    if (!ethers_1.default.utils.isHexString(signature)) {
        throw new Error('Given value "'.concat(signature, '" is not a valid hex string.'));
    }
    const r = signature.slice(0, 66);
    const s = '0x'.concat(signature.slice(66, 130));
    let v = ethers_1.default.BigNumber.from('0x'.concat(signature.slice(130, 132))).toNumber();
    if (![27, 28].includes(v))
        v += 27;
    return {
        r,
        s,
        v,
    };
};
const getSignerByAddress = (userAddress, ethersProvider) => {
    let signer = ethersProvider.getSigner();
    signer = signer.connectUnchecked();
    signer.getAddress = () => __awaiter(void 0, void 0, void 0, function* () { return userAddress; });
    return signer;
};
/**
 * Class to provide methods for biconomy wallet deployment,
 *  signature building and sending the transaction
 */
class BiconomyWalletClient {
    constructor(biconomyWalletClientParams) {
        this.getSignerByAddress = getSignerByAddress;
        const { provider, ethersProvider, walletFactoryAddress, baseWalletAddress, entryPointAddress, handlerAddress, networkId, } = biconomyWalletClientParams;
        this.provider = provider;
        this.ethersProvider = ethersProvider;
        this.walletFactoryAddress = walletFactoryAddress;
        this.baseWalletAddress = baseWalletAddress;
        this.entryPointAddress = entryPointAddress;
        this.handlerAddress = handlerAddress;
        this.networkId = networkId;
        this.walletFactory = new ethers_1.default.Contract(this.walletFactoryAddress, abis_1.walletFactoryAbi, this.ethersProvider);
        this.baseWallet = new ethers_1.default.Contract(this.baseWalletAddress, abis_1.baseWalletAbi, this.ethersProvider);
        this.entryPoint = new ethers_1.default.Contract(this.entryPointAddress, abis_1.entryPointAbi, this.ethersProvider);
    }
    checkIfWalletExists(checkIfWalletExistsParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const { eoa, index } = checkIfWalletExistsParams;
            // Read calls would need providerOrSigner
            const walletAddress = yield this.walletFactory.getAddressForCounterfactualWallet(eoa, index);
            const doesWalletExist = yield this.walletFactory.isWalletExist(walletAddress);
            if (doesWalletExist) {
                return {
                    doesWalletExist,
                    walletAddress,
                };
            }
            return {
                doesWalletExist,
                walletAddress,
            };
        });
    }
    checkIfWalletExistsAndDeploy(checkIfWalletExistsAndDeployParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const { eoa, index } = checkIfWalletExistsAndDeployParams;
            const walletAddress = yield this.walletFactory.getAddressForCounterfactualWallet(eoa, index);
            const doesWalletExist = yield this.walletFactory.isWalletExist[walletAddress];
            if (!doesWalletExist) {
                yield this.walletFactory.deployCounterFactualWallet(eoa, this.entryPointAddress, this.handlerAddress, index);
            }
            return walletAddress;
        });
    }
    // Gasless transaction
    // gasPrice and baseGas will always be zero
    // we would add separate ERC20 (Forward) payment handlers in sdk
    buildExecTransaction(buildExecTransactionParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, to, walletAddress, batchId = 0, } = buildExecTransactionParams;
            this.baseWallet = this.baseWallet.attach(walletAddress);
            const nonce = yield this.baseWallet.getNonce(batchId);
            return {
                to,
                value: 0,
                data,
                operation: 0,
                safeTxGas: 0,
                baseGas: 0,
                gasPrice: 0,
                gasToken: config_1.config.ZERO_ADDRESS,
                refundReceiver: config_1.config.ZERO_ADDRESS,
                nonce,
            };
        });
    }
    sendBiconomyWalletTransaction(sendBiconomyWalletTransactionParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const { execTransactionBody, walletAddress, signatureType, batchId, webHookAttributes, } = sendBiconomyWalletTransactionParams;
            let { signature } = sendBiconomyWalletTransactionParams;
            const transaction = {
                to: execTransactionBody.to,
                value: execTransactionBody.value,
                data: execTransactionBody.data,
                operation: execTransactionBody.operation,
                targetTxGas: execTransactionBody.targetTxGas,
            };
            const refundInfo = {
                baseGas: execTransactionBody.baseGas,
                gasPrice: execTransactionBody.gasPrice,
                gasToken: execTransactionBody.gasToken,
                refundReceiver: execTransactionBody.refundReceiver,
            };
            if (!signature) {
                if (signatureType === 'PERSONAL_SIGN') {
                    const transactionHash = yield this.baseWallet.getTransactionHash(execTransactionBody.to, execTransactionBody.value, execTransactionBody.data, execTransactionBody.operation, execTransactionBody.targetTxGas, execTransactionBody.baseGas, execTransactionBody.gasPrice, execTransactionBody.gasToken, execTransactionBody.refundReceiver, execTransactionBody.nonce);
                    // Review targetProvider vs provider
                    signature = yield this.ethersProvider.getSigner().signMessage(ethers_1.default.utils.arrayify(transactionHash));
                    const { r, s, v } = getSignatureParameters(signature);
                    const newV = ethers_1.default.BigNumber.from(v + 4).toHexString();
                    signature = r + s.slice(2) + newV.slice(2);
                }
                else {
                    signature = yield this.ethersProvider.getSigner()._signTypedData({ verifyingContract: walletAddress, chainId: this.networkId }, config_1.config.EIP712_WALLET_TX_TYPE, execTransactionBody);
                }
            }
            this.baseWallet = this.baseWallet.attach(walletAddress);
            this.baseWallet = this.baseWallet.connect(this.getSignerByAddress(walletAddress, this.ethersProvider));
            const executionData = yield this.baseWallet.populateTransaction.execTransaction(transaction, batchId, refundInfo, signature);
            const dispatchProvider = this.ethersProvider;
            // append webwallet_address key in this object webHookAttributes
            const owner = yield this.baseWallet.owner(); // eoa
            webHookAttributes.webHookData.webwallet_address = '0x111';
            const txParams = {
                data: executionData.data,
                to: this.baseWallet.address,
                from: owner,
                webHookAttributes,
            };
            let tx;
            try {
                tx = yield dispatchProvider.send('eth_sendTransaction', [txParams]);
            }
            catch (err) {
                // handle conditional rejections in this stack trace
                (0, utils_1.logMessage)(JSON.stringify(err));
                throw err;
            }
            return tx;
        });
    }
}
exports.BiconomyWalletClient = BiconomyWalletClient;
//# sourceMappingURL=BiconomyWalletClient.js.map