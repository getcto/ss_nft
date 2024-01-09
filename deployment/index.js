import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner, importKey } from '@taquito/signer';
import { char2Bytes } from '@taquito/utils';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.ADMIN_KEY;
// const key = process.env.PROD_DEPLOYER_KEY;

const contractAddress = 'KT1MYyspAXfAXFETnMwVd18wprBfzTGWQvPm';

const Tezos = new TezosToolkit('https://ghostnet.ecadinfra.com');
const signer = new InMemorySigner(key);

const tezToMutez = x => x * (10**6);

const TOKEN_TYPES = {
    NATIVE: 0,
    PARTNER: 1,
    QUEST: 2,
}

async function setTokenMetadata(contract) {
    const methods = contract.parameterSchema.ExtractSignatures();

    // SET THESE PARAMS BEFORE CALLING
    const params = [
        [{ token_id: 1, token_info: { "": char2Bytes("http://api.starsymphony.io/mint/native/1") } }]
    ];

    // use below 3 lines to debug when needed
    // const setTokenMetadataSignature = methods.filter((items) => items[0] === 'set_token_metadata' )[0][1];
    // const setTokenMetadataParams = contract.methods.set_token_metadata(params).toTransferParams();
    // console.log(JSON.stringify(setTokenMetadataParams, null, 2));

    const op = await contract.methods.set_token_metadata(params).send();
    const hash = await op.confirmation(3);
    console.log(hash);
    console.log("set_token_metadata operation sent successfully");
}

async function publishTokens(contract) {
    const methods = contract.parameterSchema.ExtractSignatures();
    
    // SET THESE PARAMS BEFORE CALLING
    const params = [
        { price: tezToMutez(2), type: TOKEN_TYPES.NATIVE }
    ];
    
    // use below 3 lines to debug when needed
    // const entrypointSignature = methods.filter((items) => items[0] === 'publish_token' )[0][1];
    // const entrypointParams = contract.methods.publish_token(params).toTransferParams();
    // console.log(JSON.stringify(entrypointParams, null, 2));

    const op = await contract.methods.publish_token(params).send();
    const hash = await op.confirmation(3);
    console.log(hash);
    console.log("publish_token operation sent successfully");
}

async function main() {
    Tezos.setProvider({ signer });
    const contract = await Tezos.contract.at(contractAddress); // load contract
    // await setTokenMetadata(contract); // uncomment this to run it
    // await publishTokens(contract); // uncomment this to run it

}

main();