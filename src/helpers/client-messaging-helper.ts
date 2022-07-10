/* eslint-disable consistent-return */
/* eslint-disable no-await-in-loop */
import { ClientMessenger } from 'gasless-messaging-sdk';
import { logMessage } from '../utils';
import type { Biconomy } from '..';
import { config } from '../config';

const clientMessenger = new ClientMessenger(
  config.webSocketConnectionUrl,
);

const retryConnect = async () => {
  if (!clientMessenger.socketClient.isConnected()) {
    console.log('connecting clientMessenger');
    try {
      await clientMessenger.connect();
      console.log('returning true');
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
};
export const mexaSdkClientMessenger = async (
  engine: Biconomy,
  transactionData: { transactionId: string },
) => {
  try {
    const { transactionId } = transactionData;

    console.log(clientMessenger.socketClient.isConnected());

    if (!clientMessenger.socketClient.isConnected()) {
      let isConnectionMade = await retryConnect();
      const connectionCount = 1;
      for (let retryIndex = 0; retryIndex < 10; retryIndex += 1) {
        if (!isConnectionMade) {
          console.log('connectionCount', connectionCount);
          isConnectionMade = await retryConnect();
          console.log('isConnectionMade', isConnectionMade);
        } else {
          break;
        }
      }
      console.log('connection made');
    }
    console.log('connection made outside while');
    console.log(clientMessenger.socketClient.isConnected());

    clientMessenger.createTransactionNotifier(transactionId, {
      onMined: (tx: { transactionId: string; transactionHash: string; }) => {
        console.log(`Tx Hash mined message received at client with id ${tx.transactionId} and hash ${tx.transactionHash}`);

        engine.emit('txMined', () => ({
          msg: 'txn mined',
          id: tx.transactionId,
          hash: tx.transactionHash,
        }));
      },
      onHashGenerated: (tx: { transactionId: string; transactionHash: string; }) => {
        console.log(`Tx Hash generated message received at client ${tx.transactionId} and hash ${tx.transactionHash}`);

        engine.emit('txHashGenerated', () => ({
          msg: 'hash generated',
          id: tx.transactionId,
          hash: tx.transactionHash,
        }));
      },
      // TODO
      // Change type in messaging sdk
      onError: (errorResponseData: { error: any; transactionId: string; }) => {
        console.log(`Error message received at client\n ${errorResponseData.error}`);
        engine.emit('onError', () => ({
          // code: errorResponseData.code,
          error: errorResponseData.error,
          transactionId: errorResponseData.transactionId,
        }));
      },
    });
  } catch (error) {
    console.log(error);
    logMessage(JSON.stringify(error));
  }
};
