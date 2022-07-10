import { ClientMessenger } from 'gasless-messaging-sdk';
import { logMessage } from '../utils';
import type { Biconomy } from '..';
import { config } from '../config';

const clientMessenger = new ClientMessenger(
  config.webSocketConnectionUrl,
);

export const mexaSdkClientMessenger = async (
  engine: Biconomy,
  transactionData: { transactionId: string },
) => {
  try {
    const { transactionId } = transactionData;

    console.log('Emitting test event');
    engine.emit('test', {
      test: 'test',
    });

    console.log('Test event emitted');
    console.log(clientMessenger.socketClient.isConnected());
    if (!clientMessenger.socketClient.isConnected()) {
      console.log('connecting clientMessenger');
      await clientMessenger.connect();
      console.log('clientMessenger is connected');
    }

    // clientMessenger.createTransactionNotifier(transactionId, {
    //   onMined: (tx: { transactionId: string; transactionHash: string; }) => {
    //     console.log(`Tx Hash mined message received at client with id ${tx.transactionId} and hash ${tx.transactionHash}`);

    //     engine.emit('txMined', () => ({
    //       msg: 'txn mined',
    //       id: tx.transactionId,
    //       hash: tx.transactionHash,
    //     }));
    //   },
    //   onHashGenerated: (tx: { transactionId: string; transactionHash: string; }) => {
    //     console.log(`Tx Hash generated message received at client ${tx.transactionId} and hash ${tx.transactionHash}`);

    //     engine.emit('txHashGenerated', () => ({
    //       msg: 'hash generated',
    //       id: tx.transactionId,
    //       hash: tx.transactionHash,
    //     }));
    //   },
    //   // TODO
    //   // Change type in messaging sdk
    //   onError: (errorResponseData: { error: any; transactionId: string; }) => {
    //     console.log(`Error message received at client\n ${errorResponseData.error}`);
    //     engine.emit('onError', () => ({
    //       // code: errorResponseData.code,
    //       error: errorResponseData.error,
    //       transactionId: errorResponseData.transactionId,
    //     }));
    //   },
    // });
  } catch (error) {
    console.log(error);
    logMessage(JSON.stringify(error));
  }
};
