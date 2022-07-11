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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTransaction = void 0;
const request_promise_1 = require("request-promise");
const config_1 = require("../config");
const utils_1 = require("../utils");
const client_messaging_helper_1 = require("./client-messaging-helper");
/**
 * Method to send the transaction to biconomy server and call the callback method
 * to pass the result of meta transaction to web3 function call.
 * @param this Object representing biconomy provider this
 * @param account User selected account on current wallet
 * @param data Data to be sent to biconomy server having transaction data
 * */
function sendTransaction(account, data, fallback) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this || !account || !data) {
            return undefined;
        }
        const options = {
            uri: `${config_1.config.metaEntryPointBaseUrl}/api/v2/meta-tx/native`,
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json;charset=utf-8',
            },
            timeout: 600000,
            body: JSON.stringify(data),
        };
        (0, utils_1.logMessage)('request body');
        (0, utils_1.logMessage)(JSON.stringify(data));
        const response = yield (0, request_promise_1.post)(options);
        (0, utils_1.logMessage)(response);
        const result = JSON.parse(response);
        if (result.transactionId && result.flag === config_1.BICONOMY_RESPONSE_CODES.SUCCESS) {
            yield (0, client_messaging_helper_1.mexaSdkClientMessenger)(this, {
                transactionId: result.transactionId,
            });
        }
        else if (result.flag === config_1.BICONOMY_RESPONSE_CODES.BAD_REQUEST) {
            yield fallback();
        }
        const error = {};
        error.code = result.flag || result.code;
        if (result.flag === config_1.BICONOMY_RESPONSE_CODES.USER_CONTRACT_NOT_FOUND) {
            error.code = config_1.RESPONSE_CODES.USER_CONTRACT_NOT_FOUND;
        }
        error.message = result.log || result.message;
        return error.toString();
    });
}
exports.sendTransaction = sendTransaction;
//# sourceMappingURL=send-transaction-helper.js.map