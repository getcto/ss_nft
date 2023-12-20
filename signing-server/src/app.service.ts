import { Injectable } from '@nestjs/common';
import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import { char2Bytes } from '@taquito/utils';
import { ConfigService } from '@nestjs/config';

const Tezos = new TezosToolkit('https://mainnet-tezos.giganode.io');

async function signMessage(key: string, message: string) {
  const signer = new InMemorySigner(key);
  Tezos.setProvider({ signer });

  // The data to format
  const dappUrl = 'star-symphony.app';
  const ISO8601formatedTimestamp = new Date().toISOString();

  // The full string
  const formattedInput: string = [
    'Tezos Signed Message:',
    dappUrl,
    ISO8601formatedTimestamp,
    message,
  ].join(' ');

  const bytes = char2Bytes(formattedInput);
  const bytesLength = (bytes.length / 2).toString(16);
  const addPadding = `00000000${bytesLength}`;
  const paddedBytesLength = addPadding.slice(addPadding.length - 8);
  const payloadBytes = '05' + '01' + paddedBytesLength + bytes;

  const signature = signer.sign(payloadBytes);

  return (await signature).sig;
}

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  signForAddress(address: string): Promise<string> {
    const key = this.configService.get<string>('KEY');
    return signMessage(key, address);
  }
}
