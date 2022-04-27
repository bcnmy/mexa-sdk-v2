export const config = {
  forwardRequestType: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'txGas', type: 'uint256' },
    { name: 'tokenGasPrice', type: 'uint256' },
    { name: 'batchId', type: 'uint256' },
    { name: 'batchNonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'data', type: 'bytes' },
  ],
  customForwardRequestType: [
    { name: 'warning', type: 'string' },
    { name: 'info', type: 'string' },
    { name: 'action', type: 'string' },
    { name: 'request', type: 'ERC20ForwardRequest' },
  ],
  domainType: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  SCW: 'SCW',
};

export const RESPONSE_CODES = {
  ERROR_RESPONSE: 'B500',
  API_NOT_FOUND: 'B501',
  USER_CONTRACT_NOT_FOUND: 'B502',
  USER_NOT_LOGGED_IN: 'B503',
  USER_ACCOUNT_NOT_FOUND: 'B504',
  NETWORK_ID_MISMATCH: 'B505',
  BICONOMY_NOT_INITIALIZED: 'B506',
  NETWORK_ID_NOT_FOUND: 'B507',
  SMART_CONTRACT_NOT_FOUND: 'B508',
  DAPP_NOT_FOUND: 'B509',
  INVALID_PAYLOAD: 'B510',
  DASHBOARD_DATA_MISMATCH: 'B511',
  SUCCESS_RESPONSE: 'B200',
  USER_CONTRACT_CREATION_FAILED: 'B512',
  EVENT_NOT_SUPPORTED: 'B513',
  INVALID_DATA: 'B514',
  INVALID_OPERATION: 'B515',
  WRONG_ABI: 'B516',
};

export const BICONOMY_RESPONSE_CODES = {
  SUCCESS: 200,
  ACTION_COMPLETE: 143,
  USER_CONTRACT_NOT_FOUND: 148,
  ERROR_RESPONSE: 144,
};

export const HTTP_CODES = {
  OK: 200,
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404,
  CONFLICT: 409,
  EXPECTATION_FAILED: 417,
};

export const RESPONSE_BODY_CODES = {
  OK: 200,
  DAPP_LIMIT_REACHED: 150,
  USER_LIMIT_REACHED: 151,
  API_LIMIT_REACHED: 152,
  GAS_ESTIMATION_FAILED: 417,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
};

export const STATUS = {
  INIT: 'init',
  BICONOMY_READY: 'biconomy_ready',
  NO_DATA: 'no_data',
};
