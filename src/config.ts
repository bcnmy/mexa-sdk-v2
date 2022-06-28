// TODO
// Review and update URLs
export const config = {
  SCW: 'SCW',
  metaEntryPointBaseUrl: 'http://localhost:3000',
  getDappDataUrl: 'http://localhost:4001/api/v1/sdk/dapp',
  JSON_RPC_VERSION: '2.0',
  eip712SigVersion: '1',
  eip712DomainName: 'Biconomy Meta Transaction',
  eip712VerifyingContract: '0x3457dC2A8Ff1d3FcC45eAd532CA1740f5c477160',
  socketClientEndpoint: 'wss://gasless-staging-wss.biconomy.io/connection/websocket',
  DEFAULT_RELAYER_PAYMENT_TOKEN_ADDRESS: '0x0000000000000000000000000000000000000000',
  DEFAULT_RELAYER_PAYMENT_AMOUNT: 0,
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  NONCE_BATCH_ID: 0,
  EXPIRY: 0,
  BASE_GAS: 0,
  EIP712_SAFE_TX_TYPE: {
    // "SafeTx(
    //  address to,
    //  uint256 value,
    //  bytes data,
    //  uint8 operation,
    //  uint256 safeTxGas,
    //  uint256 baseGas,
    //  uint256 gasPrice,
    //  address gasToken,
    //  address refundReceiver,
    //  uint256 nonce)"
    SafeTx: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'value' },
      { type: 'bytes', name: 'data' },
      { type: 'uint8', name: 'operation' },
      { type: 'uint256', name: 'safeTxGas' },
      { type: 'uint256', name: 'baseGas' },
      { type: 'uint256', name: 'gasPrice' },
      { type: 'address', name: 'gasToken' },
      { type: 'address', name: 'refundReceiver' },
      { type: 'uint256', name: 'nonce' },
    ],
  },
};

export const EVENTS = {
  SMART_CONTRACT_DATA_READY: 'smart_contract_data_ready',
  DAPP_API_DATA_READY: 'dapp_api_data_ready',
  LOGIN_CONFIRMATION: 'login_confirmation',
  BICONOMY_ERROR: 'biconomy_error',
  HELPER_CLENTS_READY: 'permit_and_ercforwarder_clients_ready',
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
  INTERFACE_MAP_UNDEFINED: 'B517',
  DAPP_API_MAP_UNDEFINED: 'B518', // TODO convert to enum all error codes
  SMART_CONTRACT_METATRANSACTION_MAP_UNDEFINED: 'B519',
  SMART_CONTRACT_MAP_UNDEFINED: 'B520',
  FORWARDER_DOMAIN_DATA_UNDEFINED: 'B521',
  FORWARDER_DOMAIN_DETAILS_UNDEFINED: 'B522',
  BICONOMY_FORWARDER_UNDEFINED: 'B523',
  SMART_CONTRACT_TRSUTED_FORWARDER_MAP_UNDEFINED: 'B524',
  DAPP_ID_UNDEFINED: 'B525',
  FORWARDER_ADDRESSES_ARRAY_UNDEFINED: 'B526',
  FORWARDER_ADDRESS_UNDEFINED: 'B527',
  CONTRACT_ABI_UNDEFINED: 'B528',
  FORWARDER_DOMAIN_TYPE_UNDEFINED: 'B529',
  FORWARDER_REQUEST_TYPE_UNDEFINED: 'B530',
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

export const domainType = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'verifyingContract', type: 'address' },
  { name: 'salt', type: 'bytes32' },
];

export const metaTransactionType = [
  { name: 'nonce', type: 'uint256' },
  { name: 'from', type: 'address' },
  { name: 'functionSignature', type: 'bytes' },
];
