import { useState, Dispatch, SetStateAction, useEffect } from "react";
import { TezosToolkit, BigMapAbstraction } from "@taquito/taquito";
import { BigNumber } from 'bignumber.js';

export type StarSymphonyStorage = {
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

const fetchDataFromStorage = async (bigMap: BigMapAbstraction, keys: number[] | [string, number][]) => {
  const rawData = await bigMap.getMultipleValues(keys);
  // @ts-expect-error we know valueMap exists
  return Object.fromEntries(rawData.valueMap);
};

const Storage = ({
  Tezos,
  storage,
  userAddress,
  setPublishedTokens
}: {
  Tezos: TezosToolkit;
  storage: StarSymphonyStorage;
  userAddress: string;
  setPublishedTokens: Dispatch<SetStateAction<number[]>>;
}): JSX.Element => {
  const [data, setData] = useState({});

  useEffect(() => {
    async function main() {
      console.log('fetching maps...')
      const publishedTokensData = await fetchDataFromStorage(storage['published_tokens'], [0, 1, 2, 3]);
      const ledgerData = await fetchDataFromStorage(storage['ledger'], [[userAddress, 0], [userAddress, 1], [userAddress, 2], [userAddress, 3]]);
      const lastMintedData = await fetchDataFromStorage(storage['last_minted'], [[userAddress, 0], [userAddress, 1], [userAddress, 2], [userAddress, 3]]);
      setPublishedTokens(Object.entries(publishedTokensData).filter(([k,v]) => v).map(([k,v]) => Number(k)));
      setData({
        next_token_id: storage.next_token_id.toNumber(),
        publishedTokens: publishedTokensData,
        ledger: ledgerData,
        last_minted: lastMintedData
      });
    }
    main();
  }, []);

  return (
    <div id="storage-values">
      <h2 className='text-lg font-bold align-'>storage (raw):</h2>
      <pre className='text-left'>
        {JSON.stringify(storage, null, 2)}
      </pre>
      <h2 className='text-lg font-bold'>parsed</h2>
          {storage &&
            (
              <>
                <pre className='text-left'>
                  {JSON.stringify(data, null, 2)}
                </pre>
              </>
            )
          }
    </div>
  );
};

export default Storage;
