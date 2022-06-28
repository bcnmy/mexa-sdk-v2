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
  execTransactionBody,
  walletAddress: string,
  signatureType: string,
  signature?: string,
};

export type BiconomyWalletClientParamsType = {
  biconomyProvider, // notice we passed engine (Biconomy) here
  provider,
  // Either we pass above both or target provider and use API calls to relay
  targetProvider,
  biconomyAttributes,
  isSignerWithAccounts,
  walletFactoryAddress: string,
  baseWalletAddress: string,
  entryPointAddress: string,
  handlerAddress: string,
  networkId: number,
};
