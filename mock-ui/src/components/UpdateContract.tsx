import React, { useState, Dispatch, SetStateAction } from "react";
import { TezosToolkit, WalletContract } from "@taquito/taquito";
import { StarSymphonyStorage } from "./Storage";

interface UpdateContractProps {
  contract: WalletContract | any;
  setUserBalance: Dispatch<SetStateAction<any>>;
  Tezos: TezosToolkit;
  userAddress: string;
  setStorage: Dispatch<SetStateAction<StarSymphonyStorage>>;
  publishedTokens: number[];
}

const UpdateContract = ({ contract, setUserBalance, Tezos, userAddress, setStorage, publishedTokens }: UpdateContractProps) => {
  const [loadingMintNative, setLoadingMintNative] = useState<boolean>(false);
  const [loadingMintPartner, setLoadingMintPartner] = useState<boolean>(false);
  const [amount, setAmount] = useState<number>(0); // new state variable for amount
  const [tokenId, setTokenId] = useState<number>(publishedTokens[0] || 0); 

  const mintNative = async (): Promise<void> => {
    setLoadingMintNative(true);
    try {
      const op = await contract.methods.mint_native(amount, userAddress).send();
      await op.confirmation();
      const newStorage: any = await contract.storage();
      if (newStorage) setStorage(newStorage);
      setUserBalance(await Tezos.tz.getBalance(userAddress));
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingMintNative(false);
    }
  };

  const mintPartner = async (): Promise<void> => {
    setLoadingMintPartner(true);
    try {
      // last = token id, as displayed on better-call
      const op = await contract.methods.mint_partner(1, userAddress, tokenId).send();
      await op.confirmation();
      const newStorage: any = await contract.storage();
      if (newStorage) setStorage(newStorage.toNumber());
      setUserBalance(await Tezos.tz.getBalance(userAddress));
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingMintPartner(false);
    }
  };

  if (!contract && !userAddress) return <div>&nbsp;</div>;
  return (
    <div className="flex flex-col justify-around">
      <h2 className="text-lg font-bold text-center mb-5">Mint Native NFT</h2>
      <section className="flex justify-around mb-10 items-center">
        <label htmlFor="amount">
          Amount
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="Enter amount"
          className="input border p-2"
        />
        <button className="button" disabled={loadingMintNative} onClick={mintNative}>
          {loadingMintNative ? (
            <span>
              <i className="fas fa-spinner fa-spin"></i>&nbsp; Please wait
            </span>
          ) : (
            <span>
              Mint Native
            </span>
          )}
        </button>



      </section>

      <h2 className="text-lg font-bold text-center mb-5">Mint Partner NFT</h2>
      <section  className="flex justify-around mb-10">
        <div className="text-center text-lg mb-5">
          Published Partner NFT id's: {publishedTokens.join(',')}
        </div>
        <select
          value={tokenId}
          onChange={(e) => setTokenId(Number(e.target.value))}
          className="select border p-2 mr-2"
        >
          {publishedTokens.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <button className="button" onClick={mintPartner}>
          {loadingMintPartner ? (
            <span>
              <i className="fas fa-spinner fa-spin"></i>&nbsp; Please wait
            </span>
          ) : (
            <span>
              Mint Partner
            </span>
          )}
        </button>
      </section>
    </div>
  );
};

export default UpdateContract;
