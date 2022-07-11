/* eslint-disable consistent-return */
import { logMessage } from '../utils';
import type { Biconomy } from '..';

export const mexaSdkClientMessenger = async (
  engine: Biconomy,
  transactionData: { transactionId: string },
) => {
  try {
    const { transactionId } = transactionData;
    engine.clientMessenger.createTransactionNotifier(transactionId, {
      onMined: (tx: { transactionId: string; transactionHash: string; }) => {
        logMessage(`Tx Hash mined message received at client with id ${tx.transactionId} and hash ${tx.transactionHash}`);

        engine.emit('txMined', {
          msg: 'txn mined',
          id: tx.transactionId,
          hash: tx.transactionHash,
        });
      },
      onHashGenerated: (tx: { transactionId: string; transactionHash: string; }) => {
        logMessage(`Tx Hash generated message received at client ${tx.transactionId} and hash ${tx.transactionHash}`);

        engine.emit('txHashGenerated', {
          msg: 'hash generated',
          id: tx.transactionId,
          hash: tx.transactionHash,
        });
      },
      onError: (errorResponseData: { error: any; transactionId: string; }) => {
        logMessage(`Error message received at client\n ${errorResponseData.error}`);
        engine.emit('onError', {
          error: errorResponseData.error,
          transactionId: errorResponseData.transactionId,
        });
      },
    });
  } catch (error) {
    logMessage(error);
    logMessage(JSON.stringify(error));
  }
};
