import { Injectable } from '@nestjs/common';
import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import {
  packDataBytes,
  MichelsonData,
  MichelsonType,
} from '@taquito/michel-codec';
import { ConfigService } from '@nestjs/config';

const Tezos = new TezosToolkit('https://mainnet-tezos.giganode.io');

async function signMessage(key: string, params: CreateSignatureParams) {
  const signer = new InMemorySigner(key);
  console.log({ publicKey: await signer.publicKey() });
  Tezos.setProvider({ signer });

  console.log({ params });

  const data = {
    prim: 'Pair',
    args: [
      { string: params.address },
      { int: String(params.allocationQty) },
      { int: String(params.token_id) },
    ],
  };
  const type = {
    prim: 'pair',
    args: [{ prim: 'address' }, { prim: 'int' }, { prim: 'int' }],
  };
  const bytes = packDataBytes(
    data as MichelsonData,
    type as MichelsonType,
  ).bytes;
  const result = await signer.sign(bytes);
  return result.sig;
}

type CreateSignatureParams = {
  address: string;
  token_id: number;
  allocationQty: number;
};

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  createSignature(params: CreateSignatureParams): Promise<string> {
    const key = this.configService.get<string>('KEY');
    const signature = signMessage(key, params);
    return signature;
  }
}
