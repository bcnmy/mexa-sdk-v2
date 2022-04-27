  /**
   * Function decodes the parameter in payload and gets the user signature using eth_signTypedData_v4
   * method and send the request to biconomy for processing and call the callback method 'end'
   * with transaction hash.
   *
   * This is an internal function that is called while intercepting eth_sendTransaction RPC method call.
   **/
   async function handleSendTransaction(engine, payload, end) {
    try {
      _logMessage("Handle transaction with payload");
      _logMessage(payload);
      if (payload.params && payload.params[0] && payload.params[0].to) {
        let to = payload.params[0].to.toLowerCase();
        if (interfaceMap[to] || interfaceMap[config.SCW]) {
          let methodInfo = decodeMethod(to, payload.params[0].data);
  
          // Check if the Smart Contract Wallet is registered on dashboard
          if (!methodInfo) {
            methodInfo = decodeMethod(config.SCW, payload.params[0].data);
          }
          if (!methodInfo) {
            let error = {};
            error.code = RESPONSE_CODES.WRONG_ABI;
            error.message = `Can't decode method information from payload. Make sure you have uploaded correct ABI on Biconomy Dashboard`;
            return end(error, null);
          }
          let methodName = methodInfo.name;
          let api = engine.dappAPIMap[to]
            ? engine.dappAPIMap[to][methodName]
            : undefined;
          // Information we get here is contractAddress, methodName, methodType, ApiId
          let metaTxApproach;
          let customBatchId;
          let customDomainName, customDomainVersion;
          let signTypedDataType;
          if (!api) {
            api = engine.dappAPIMap[config.SCW]
              ? engine.dappAPIMap[config.SCW][methodName]
              : undefined;
            metaTxApproach = smartContractMetaTransactionMap[config.SCW];
          } else {
            let contractAddr = api.contractAddress.toLowerCase();
            metaTxApproach = smartContractMetaTransactionMap[contractAddr];
          }
  
          //Sanitise gas limit here. big number / hex / number -> hex
          let gasLimit = payload.params[0].gas || payload.params[0].gasLimit;
          if(gasLimit) {
          gasLimit = ethers.BigNumber.from(gasLimit.toString()).toHexString();
          }
          let txGas = payload.params[0].txGas;
          let signatureType = payload.params[0].signatureType;
          if(payload.params[0].batchId){
          customBatchId = Number(payload.params[0].batchId);
          }
  
          if(payload.params[0].domainName){
            customDomainName = payload.params[0].domainName;
          }
  
          if(payload.params[0].domainVersion){
            customDomainVersion = payload.params[0].domainVersion;
          }
  
          if(payload.params[0].signTypedDataType) {
            signTypedDataType = payload.params[0].signTypedDataType;
          }
  
          _logMessage(payload.params[0]);
          _logMessage(api);
          _logMessage(`gas limit : ${gasLimit}`);
          if(txGas){
          _logMessage(`tx gas supplied : ${txGas}`);
          }
  
          if (!api) {
            
            _logMessage(`API not found for method ${methodName}`);
            _logMessage(`Strict mode ${engine.strictMode}`);
            if (engine.strictMode) {
              let error = {};
              error.code = RESPONSE_CODES.API_NOT_FOUND;
              error.message = `Biconomy strict mode is on. No registered API found for method ${methodName}. Please register API from developer dashboard.`;
              return end(error, null);
            } else {
              _logMessage(
                `Falling back to default provider as strict mode is false in biconomy`
              );
              try {
                return callDefaultProvider(engine, payload, end, `No registered API found for method ${methodName}. Please register API from developer dashboard.`);
              } catch (error) {
                return end(error);
              }
            }
          }
          _logMessage("API found");
  
          _logMessage("Getting user account");
          let account = payload.params[0].from;
  
          if (!account) {
            return end(`Not able to get user account`);
          }
          _logMessage(`User account fetched`);
  
          _logMessage(methodInfo.args);
          let paramArray = [];
  
          if (metaTxApproach == engine.ERC20_FORWARDER) {
            let error = formatMessage(
              RESPONSE_CODES.INVALID_PAYLOAD,
              `This operation is not allowed for contracts registered on dashboard as "ERC20Forwarder". Use ERC20Forwarder client instead!`
            );
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
            return end(error);
          }
  
          let forwardedData, gasLimitNum;
  
          if (api.url == NATIVE_META_TX_URL) {
            if (metaTxApproach == engine.TRUSTED_FORWARDER) {
              _logMessage("Smart contract is configured to use Trusted Forwarder as meta transaction type");
              forwardedData = payload.params[0].data;
  
              let signatureFromPayload = payload.params[0].signature;
              // Check if txGas is present, if not calculate gas limit for txGas
              
              if (!txGas || parseInt(txGas) == 0) {
                let contractABI = smartContractMap[to];
                if (contractABI) {
                  let contract = new ethers.Contract(to, JSON.parse(contractABI), engine.ethersProvider);
                  txGas = await contract.estimateGas[methodInfo.signature](...methodInfo.args, { from: account });
                   // do not send this value in API call. only meant for txGas
                  gasLimitNum = ethers.BigNumber.from(txGas.toString())
                   .add(ethers.BigNumber.from(5000))
                   .toNumber();
  
                  _logMessage(`Gas limit (txGas) calculated for method ${methodName} in SDK: ${gasLimitNum}`);
                }
                else {
                  let error = formatMessage(
                    RESPONSE_CODES.SMART_CONTRACT_NOT_FOUND,
                    `Smart contract ABI not found!`
                  );
                  eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
                  end(error);
                }
              } else {
                _logMessage(`txGas supplied for this Trusted Forwarder call is ${Number(txGas)}`);
                gasLimitNum = ethers.BigNumber.from(
                  txGas.toString()
                ).toNumber();
                _logMessage("gas limit number for txGas " + gasLimitNum);
              }
  
              let forwarderToAttach = await findTheRightForwarder(engine,to);
  
              const request = (
                await buildForwardTxRequest(
                  account,
                  to,
                  parseInt(gasLimitNum), //txGas
                  forwardedData,
                  biconomyForwarder.attach(forwarderToAttach),
                  customBatchId
                )
              ).request;
              _logMessage(request);
  
              paramArray.push(request);
  
              forwarderDomainData.verifyingContract = forwarderToAttach;
              let domainDataToUse = forwarderDomainDetails[forwarderToAttach];
  
              if(customDomainName) {
                domainDataToUse.name = customDomainName.toString();
              }
      
              if(customDomainVersion) {
                domainDataToUse.version = customDomainVersion.toString();
              }
  
              if (signatureType && signatureType == engine.EIP712_SIGN) {
                _logMessage("EIP712 signature flow");
                // Update the verifyingContract field of domain data based on the current request
                const domainSeparator = getDomainSeperator(
                  domainDataToUse
                );
                _logMessage("Domain separator to be used:")
                _logMessage(domainSeparator);
                paramArray.push(domainSeparator);
                let signatureEIP712;
                if (signatureFromPayload) {
                  signatureEIP712 = signatureFromPayload;
                  _logMessage(`EIP712 signature from payload is ${signatureEIP712}`);
                } else {
                  signatureEIP712 = await getSignatureEIP712(
                    engine,
                    account,
                    request,
                    forwarderToAttach,
                    domainDataToUse,
                    signTypedDataType
                  );
                  _logMessage(`EIP712 signature is ${signatureEIP712}`);
                }
                paramArray.push(signatureEIP712);
              } else {
                _logMessage("Personal signature flow");
                let signaturePersonal;
                if (signatureFromPayload) {
                  signaturePersonal = signatureFromPayload;
                  _logMessage(`Personal signature from payload is ${signaturePersonal}`);
                } else {
                  signaturePersonal = await getSignaturePersonal(
                    engine,
                    request
                  );
                  _logMessage(`Personal signature is ${signaturePersonal}`);
                }
                if (signaturePersonal) {
                  paramArray.push(signaturePersonal);
                } else {
                  throw new Error("Could not get personal signature while processing transaction in Mexa SDK. Please check the providers you have passed to Biconomy")
                }
              }
  
              let data = {};
              data.from = account;
              data.apiId = api.id;
              data.params = paramArray;
              data.to = to;
              //gasLimit for entire transaction
              //This will be calculated at the backend again
              data.gasLimit = gasLimit;
              if (signatureType && signatureType == engine.EIP712_SIGN) {
                data.signatureType = engine.EIP712_SIGN;
              }
              await _sendTransaction(engine, account, api, data, end);
            } else {
              paramArray.push(...methodInfo.args);
  
              let data = {};
              data.from = account;
              data.apiId = api.id;
              data.params = paramArray;
              data.gasLimit = gasLimit;
              data.to = to;
              _sendTransaction(engine, account, api, data, end);
            }
          } else {
            let error = formatMessage(
              RESPONSE_CODES.INVALID_OPERATION,
              `Biconomy smart contract wallets are not supported now. On dashboard, re-register your smart contract methods with "native meta tx" checkbox selected.`
            );
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
            return end(error);
          }
        } else {
          if (engine.strictMode) {
            let error = formatMessage(
              RESPONSE_CODES.BICONOMY_NOT_INITIALIZED,
              `Decoders not initialized properly in mexa sdk. Make sure your have smart contracts registered on Mexa Dashboard`
            );
            eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
            end(error);
          } else {
            _logMessage(
              "Smart contract not found on dashbaord. Strict mode is off, so falling back to normal transaction mode"
            );
            try {
              return callDefaultProvider(engine, payload, end, `Current provider can't send transactions and smart contract ${to} not found on Biconomy Dashbaord`);
            } catch (error) {
              return end(error);
            }
          }
        }
      } else {
        let error = formatMessage(
          RESPONSE_CODES.INVALID_PAYLOAD,
          `Invalid payload data ${JSON.stringify(
            payload
          )}. Expecting params key to be an array with first element having a 'to' property`
        );
        eventEmitter.emit(EVENTS.BICONOMY_ERROR, error);
        end(error);
      }
    }
    catch (error) {
      return end(error);
    }
  }
  }