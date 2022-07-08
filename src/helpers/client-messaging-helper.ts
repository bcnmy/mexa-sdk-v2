import { ClientMessenger } from 'gasless-messaging-sdk';
import { EventEmitter } from 'events';
import { config } from '../config';
import { logMessage } from '../utils';

const sdkEmitter = new EventEmitter();

export const mexaSdkClientMessenger = async (
  transactionData: { transactionId: string },
) => {
  try {
    const { transactionId } = transactionData;
    const { socketClientEndpoint } = config;
    const clientMessenger = new ClientMessenger(
      socketClientEndpoint,
    );

    await clientMessenger.connect();
    clientMessenger.createTransactionNotifier(transactionId, {
      onMined: (tx: { transactionId: string; transactionHash: string; }) => {
        logMessage.debug(`Tx Hash mined message received at client with id ${tx.transactionId} and hash ${tx.transactionHash}`);

        sdkEmitter.emit('txMined', () => ({
          msg: 'txn mined',
          id: tx.transactionId,
          hash: tx.transactionHash,
        }));
      },
      onHashGenerated: (tx: { transactionId: string; transactionHash: string; }) => {
        logMessage.debug(`Tx Hash generated message received at client ${tx.transactionId} and hash ${tx.transactionHash}`);

        sdkEmitter.emit('txHashGenerated', () => ({
          msg: 'hash generated',
          id: tx.transactionId,
          hash: tx.transactionHash,
        }));
      },
      // TODO
      // Change type in messaging sdk
      onError: (errorResponseData: { error: any; transactionId: string; }) => {
        logMessage.error('Error message received at client\n', errorResponseData.error);
        sdkEmitter.emit('onError', () => ({
          // code: errorResponseData.code,
          error: errorResponseData.error,
          transactionId: errorResponseData.transactionId,
        }));
      },
    });
  } catch (error) {
    logMessage.error(JSON.stringify(error));
  }
};
