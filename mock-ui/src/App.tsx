import { useState, Dispatch, SetStateAction, useEffect } from "react";
import { TezosToolkit, BigMapAbstraction } from "@taquito/taquito";
import "./App.css";
import ConnectButton from "./components/ConnectWallet";
import DisconnectButton from "./components/DisconnectWallet";
import qrcode from "qrcode-generator";
import { BigNumber } from 'bignumber.js';
// import Storage, { StarSymphonyStorage } from "./components/Storage";
import { useTezosWallet } from "./useTezoswallet";

enum BeaconConnection {
  NONE = "",
  LISTENING = "Listening to P2P channel",
  CONNECTED = "Channel connected",
  PERMISSION_REQUEST_SENT = "Permission request sent, waiting for response",
  PERMISSION_REQUEST_SUCCESS = "Wallet is connected",
}

type ParsedData = {
  next_token_id: number;
  publishedTokens: { [key: string]: boolean };
  ledger: { [key: string]: string };
  last_minted: { [key: string]: string };
}

const App = () => {
  const {
    Tezos, setTezos,
    wallet, setWallet,
    userAddress, setUserAddress,
    userBalance, setUserBalance,
    publicToken, setPublicToken,
    beaconConnection, setBeaconConnection
  } = useTezosWallet();

  const [contract, setContract] = useState<any>(undefined);
  const [storage, setStorage] = useState<StarSymphonyStorage>();
  const [copiedPublicToken, setCopiedPublicToken] = useState<boolean>(false);
  const [publishedTokens, setPublishedTokens] = useState<number[]>([]);

  const [data, setData] = useState<ParsedData | {}>({});

  useEffect(() => {
    async function main() {
      console.log('fetching maps...')
      if (!storage) return;
      const publishedTokensData = await fetchDataFromStorage(storage['published_tokens'], [0, 1, 2, 3]);
      const ledgerData = await fetchDataFromStorage(storage['ledger'], [[userAddress, 0], [userAddress, 1], [userAddress, 2], [userAddress, 3]]);
      const lastMintedData = await fetchDataFromStorage(storage['last_minted'], [[userAddress, 0], [userAddress, 1], [userAddress, 2], [userAddress, 3]]);
      setPublishedTokens(Object.entries(publishedTokensData).filter(([k, v]) => v).map(([k, v]) => Number(k)));
      setData({
        next_token_id: storage.next_token_id.toNumber(),
        publishedTokens: publishedTokensData,
        ledger: ledgerData,
        last_minted: lastMintedData
      });
    }
    main();
  }, [storage]);

  // Ghostnet Increment/Decrement contract
  const contractAddress: string = "KT1TCoyWPvvzNNHmGQCZFMrmwQYrV2hfqJGP";

  const generateQrCode = (): { __html: string } => {
    const qr = qrcode(0, "L");
    qr.addData(publicToken || "");
    qr.make();

    return { __html: qr.createImgTag(4) };
  };

  if (publicToken && (!userAddress || isNaN(userBalance))) {
    return (
      <div className="main-box">
        <h1>Start Symphony NFT Mock UI</h1>
        <div id="dialog">
          <header>Try the Start Symphony NFT Mock UI!</header>
          <div id="content">
            <p className="text-align-center">
              <i className="fas fa-broadcast-tower"></i>&nbsp; Connecting to
              your wallet
            </p>
            <div
              dangerouslySetInnerHTML={generateQrCode()}
              className="text-align-center"
            ></div>
            <p id="public-token">
              {copiedPublicToken ? (
                <span id="public-token-copy__copied">
                  <i className="far fa-thumbs-up"></i>
                </span>
              ) : (
                <span
                  id="public-token-copy"
                  onClick={() => {
                    if (publicToken) {
                      navigator.clipboard.writeText(publicToken);
                      setCopiedPublicToken(true);
                      setTimeout(() => setCopiedPublicToken(false), 2000);
                    }
                  }}
                >
                  <i className="far fa-copy"></i>
                </span>
              )}

              <span>
                Public token: <span>{publicToken}</span>
              </span>
            </p>
            <p className="text-align-center">
              Status: {beaconConnection ? "Connected" : "Disconnected"}
            </p>
          </div>
        </div>
      </div>
    );
  } else if (userAddress && !isNaN(userBalance)) {
    return (
      <div className="main-box">
        <div id="dialog">
          <div id="content">
            <p>
              <i className="far fa-file-code mr-2"></i>
              <span className="mr-2">contract:</span>
              <a
                href={`https://better-call.dev/ghostnet/${contractAddress}/operations`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {contractAddress}
              </a>
            </p>
            <p>
              <i className="fas fa-piggy-bank"></i>&nbsp;
              <span className="mr-2">connected balance:</span>
              {(userBalance / 1000000).toLocaleString("en-US")} ꜩ
            </p>
            <div className="mt-5"></div>
            <div id="actions">
              <UpdateContract
                contract={contract}
                setUserBalance={setUserBalance}
                Tezos={Tezos}
                userAddress={userAddress}
                setStorage={setStorage}
                publishedTokens={publishedTokens}
                lastMinted={data.last_minted}
              />
            </div>
            <p className="mb-5">
              <i className="far fa-address-card"></i>&nbsp;
              <span className="mr-2">connected as:</span>
              <a
                href={`https://ghostnet.tzkt.io/${userAddress}/operations/`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {userAddress}
              </a>
            </p>
            <div id="storage">
              {storage && <div id="storage-values">
                <h2 className='text-lg font-bold align-'>storage (raw):</h2>
                <pre className='text-left'>
                  {JSON.stringify(storage, null, 2)}
                </pre>
                <h2 className='text-lg font-bold'>parsed (maps) </h2>
                {storage &&
                  (
                    <>
                      <pre className='text-left'>
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </>
                  )
                }
              </div>}
            </div>

          </div>
          <DisconnectButton
            wallet={wallet}
            setPublicToken={setPublicToken}
            setUserAddress={setUserAddress}
            setUserBalance={setUserBalance}
            setWallet={setWallet}
            setTezos={setTezos}
            setBeaconConnection={setBeaconConnection}
          />
        </div>
      </div>
    );
  } else if (!publicToken && !userAddress && !userBalance) {
    return (
      <div className="main-box">
        <div className="title">
          <h1>Star Symphony NFT Mock UI</h1>
        </div>
        <div id="dialog">
          <header className="mb-10">Welcome to the Star Symphony NFT Mock UI!</header>
          <ConnectButton
            Tezos={Tezos}
            setContract={setContract}
            setPublicToken={setPublicToken}
            setWallet={setWallet}
            setUserAddress={setUserAddress}
            setUserBalance={setUserBalance}
            setStorage={setStorage}
            contractAddress={contractAddress}
            setBeaconConnection={setBeaconConnection}
            wallet={wallet}
          />
        </div>
      </div>
    );
  } else {
    return <div>An error has occurred</div>;
  }
};

interface UpdateContractProps {
  contract: WalletContract | any;
  setUserBalance: Dispatch<SetStateAction<any>>;
  Tezos: TezosToolkit;
  userAddress: string;
  setStorage: Dispatch<SetStateAction<StarSymphonyStorage | undefined>>;
  publishedTokens: number[];
  lastMinted: { [key: string]: string} | undefined;
}

function hoursAgo(dateTimeString: string) {
  const dateTime = new Date(dateTimeString).getTime();
  const now = new Date().getTime();
  const differenceInHours = Math.abs(now - dateTime) / 36e5; // 36e5 is the number of milliseconds in an hour
  return `${Math.floor(differenceInHours)} hours ago`;
}


const UpdateContract = ({ contract, setUserBalance, Tezos, userAddress, setStorage, publishedTokens, lastMinted }: UpdateContractProps) => {
  const [loadingMintNative, setLoadingMintNative] = useState<boolean>(false);
  const [loadingMintPartner, setLoadingMintPartner] = useState<boolean>(false);
  const [amount, setAmount] = useState<number>(0); // new state variable for amount
  const [tokenId, setTokenId] = useState<number>(publishedTokens[0] || 0);


  const target = `["${userAddress}",${tokenId}]`;
  console.log({
    userAddress,
    tokenId,
    lastMinted,
    target
  })
  const userLastMinted = lastMinted && Object.entries(lastMinted).filter(([k, v]) => k == target)[0][1];

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
      if (newStorage) setStorage(newStorage);
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
      <section className="flex justify-around mb-10">
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
        <p>last minted: { userLastMinted && hoursAgo(userLastMinted) }</p>
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

export default App;
