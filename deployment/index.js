import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner, importKey } from '@taquito/signer';
import dotenv from 'dotenv';
dotenv.config();


const key = process.env.TEST_DEPLOYER_KEY;

const contractAddress = 'KT1MYyspAXfAXFETnMwVd18wprBfzTGWQvPm';

const Tezos = new TezosToolkit('https://ghostnet.ecadinfra.com');
const signer = new InMemorySigner(key);

async function main() {
    const contract = await Tezos.contract.at(contractAddress);
    const methods = contract.parameterSchema.ExtractSignatures();
    // set token metadata
    const setTokenMetadataParams = contract.methods.set_token_metadata().toTransferParams();
    // JSON.stringify(setTokenMetadataParams, null, 2)
    const  await contract
}

main();