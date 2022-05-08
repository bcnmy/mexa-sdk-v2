import { ClientMessenger } from 'gasless-messaging-sdk';
import { config } from '../config';
import { logMessage } from '../utils';

export const mexaSdkClientMessenger = async (transactionData: {
  transactionId: string;
}) => {
  try {
    const { transactionId } = transactionData;
    const { socketClientEndpoint } = config;
    const clientMessenger = new ClientMessenger(socketClientEndpoint);

    await clientMessenger.connect();
    clientMessenger.createTransactionNotifier(transactionId, {
      onMined: (tx: any) => {
        logMessage.info('Tx Hash mined message received at client\n', {
          id: tx.transactionId,
          hash: tx.transactionHash,
        });
      },
      onHashGenerated: (tx: any) => {
        logMessage.info('Tx Hash generated message received at client\n', {
          id: tx.transactionId,
          hash: tx.transactionHash,
        });
      },
      onError: (errorResponseData: any) => {
        logMessage.error('Error message received at client\n', {
          code: errorResponseData.code,
          error: errorResponseData.error,
          transactionId: errorResponseData.transactionId,
        });
      },
    });
  } catch (error) {
    logMessage.error(JSON.stringify(error));
  }
};
