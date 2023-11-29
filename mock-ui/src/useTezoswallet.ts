import { useState } from 'react';
import { TezosToolkit } from '@taquito/taquito';

interface TezosWalletHook {
  Tezos: TezosToolkit;
  setTezos: React.Dispatch<React.SetStateAction<TezosToolkit>>;
  wallet: any; // Replace 'any' with a more specific type if available
  setWallet: React.Dispatch<React.SetStateAction<any>>;
  userAddress: string;
  setUserAddress: React.Dispatch<React.SetStateAction<string>>;
  userBalance: number;
  setUserBalance: React.Dispatch<React.SetStateAction<number>>;
  publicToken: string | null;
  setPublicToken: React.Dispatch<React.SetStateAction<string | null>>;
  beaconConnection: boolean;
  setBeaconConnection: React.Dispatch<React.SetStateAction<boolean>>;
  // Add other states and types if necessary
}

export const useTezosWallet = (): TezosWalletHook => {
  const [Tezos, setTezos] = useState(new TezosToolkit("https://ghostnet.ecadinfra.com"));
  const [wallet, setWallet] = useState<any>(null);
  const [userAddress, setUserAddress] = useState<string>("");
  const [userBalance, setUserBalance] = useState<number>(0);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [beaconConnection, setBeaconConnection] = useState<boolean>(false);

  // Add any relevant wallet interaction functions here

  return {
    Tezos,
    setTezos,
    wallet,
    setWallet,
    userAddress,
    setUserAddress,
    userBalance,
    setUserBalance,
    publicToken,
    setPublicToken,
    beaconConnection,
    setBeaconConnection,
    // Return other relevant values or functions
  };
};
