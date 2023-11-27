import { useEffect, useState } from 'react'
import './App.css'
import { TezosToolkit, BigMapAbstraction } from '@taquito/taquito';
import { Tzip16Module, tzip16, } from "@taquito/tzip16";
import { BigNumber } from 'bignumber.js';

const Tezos = new TezosToolkit('https://ghostnet.ecadinfra.com');
Tezos.addExtension(new Tzip16Module());

/* */
const contractAddress = "KT1BT5NjxxaQi2TZQJL4AmtuMe5y2z3PevUk";
const userAddress = "tz1SoEmB6wXupP7bPedSurBJwpTecUXHaXuu";
/* */


const fetchDataFromStorage = async (bigMap: BigMapAbstraction, keys: number[] | [string, number][] ) => {
  const rawData = await bigMap.getMultipleValues(keys);
  // @ts-expect-error we know valueMap exists
  return Object.fromEntries(rawData.valueMap);
};

type StarSymphonyStorage = {
  administrator: string;
  ledger: BigMapAbstraction;
  metadata: BigMapAbstraction;
  last_minted: BigMapAbstraction;
  next_token_id: BigNumber;
  operators: BigMapAbstraction;
  published_tokens: BigMapAbstraction;
  supply: BigMapAbstraction;
  token_metadata: BigMapAbstraction; // TODO: make compliant with tzip-16
}

function App() {
  const [storage, setStorage] = useState<StarSymphonyStorage>();
  const [data, setData] = useState({});
  useEffect(() => {
    async function main() {
      const contract = await Tezos.contract.at(contractAddress, tzip16);
      const metadata = await contract.tzip16().getMetadata();
      const views = await contract.tzip16().metadataViews();

      const getNextRes = await views.get_next().executeView();

      const storageRes = await contract.storage() as StarSymphonyStorage;
      setStorage(storageRes);
      console.log(storageRes);
      const publishedTokensData = await fetchDataFromStorage(storageRes['published_tokens'], [0, 1, 2, 3]);
      const ledgerData = await fetchDataFromStorage(storageRes['ledger'], [[userAddress, 0], [userAddress, 1], [userAddress, 2], [userAddress, 3]]);
      const lastMintedData = await fetchDataFromStorage(storageRes['last_minted'], [[userAddress, 0], [userAddress, 1], [userAddress, 2], [userAddress, 3]]);

      setData({
        next_token_id: storageRes.next_token_id.toNumber(),
        publishedTokens: publishedTokensData,
        ledger: ledgerData,
        last_minted:  lastMintedData,
        metadata,
        getNextRes: getNextRes.toNumber(),
      });
    }
    main();
  }, []);

  return (
    <>
      <p>contract: <a target="_blank" href={`https://better-call.dev/ghostnet/${contractAddress}`}>{contractAddress}</a></p>
      <p>user (not admin): {userAddress}</p>
      <h2>raw</h2>
      <p>storage (raw):</p>
      <pre>
        {JSON.stringify(storage, null, 2)}
      </pre>
      <h2>parsed</h2>
      {storage &&
        (
          <>
          <pre style={{ textAlign: 'left' }}>
            { JSON.stringify(data, null, 2) }
            </pre>
          </>
        )
      }
    </>
  )
}

export default App
