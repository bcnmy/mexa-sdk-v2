export type CheckIfWalletExistsAndDeployParamsType = {
  eoa: string,
  index: number
};

export type CheckIfWalletExistsParamsType = CheckIfWalletExistsAndDeployParamsType;

export type BuildExecTransactionParamsType = {
  data: string,
  to: string,
  walletAddress: string,
  batchId: number,
};

export type SendBiconomyWalletTransactionsParamsType = {
  execTransactionBody: any,
  walletAddress: string,
  signatureType: string,
  signature?: string,
};

export type BiconomyWalletClientParamsType = {
  biconomyProvider: any, // notice we passed engine (Biconomy) here
  provider: any,
  // Either we pass above both or target provider and use API calls to relay
  targetProvider: any,
  biconomyAttributes: any,
  isSignerWithAccounts: any,
  walletFactoryAddress: string,
  baseWalletAddress: string,
  entryPointAddress: string,
  handlerAddress: string,
  networkId: number,
};
