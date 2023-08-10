import Head from 'next/head'
import styles from '../styles/Home.module.css';
import Web3Modal from "web3modal";
import { useEffect, useRef, useState} from "react";
import {providers, Contract, utils} from "ethers";
import {abi, NFT_CONTRACT_ADDRESS} from "../constants"


export default function Home() {

  const [presaleStarted, setPresaleStarted] = useState(false);
  const [presaleEnded, setPresaleEnded] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [numTokensMinted, setNumTokensMinted] = useState('')
  const [loading, setLoading] = useState(false);
  const web3ModalRef = useRef();

  const presaleMint = async () => {
    try {
      
      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      
      const tx = await nftContract.presaleMint({value: utils.parseEther("0.01")});
      setLoading(true)
      await tx.wait();
      setLoading(false)

      window.alert('You succesfully minted a CryptoDev!')
      
    } catch (e) {
      console.error(e)
    }
    
  }

  const publicMint = async () => {
    try {
      
      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);

      const tx = await nftContract.mint({value: utils.parseEther("0.01")});
      setLoading(true)
      await tx.wait()
      setLoading(false)
      window.alert('You succesfully minted a CryptoDev!')
      
    } catch (e) {
      console.error(e)
    }
    
  }

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (e) {
      console.error(e)
    }
  };

  const startPresale = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, signer);
      const tx = await nftContract.startPresale();
      setLoading(true)
      await tx.wait();
      setLoading(false)
      await checkIfPresaleStarted();

    } catch (e) {
      console.error(e)
    }
    
  }

  const checkIfPresaleStarted = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const isPresaleStarted = await nftContract.presaleStarted();
      if (!isPresaleStarted) {
        await getOwner();
      }
      setPresaleStarted(isPresaleStarted);
      return isPresaleStarted
    } catch (e) {
      console.error(e)
      return false;
    }
  }

  const checkIfPresaleEnded = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const presaleEndTime = await nftContract.presaleEnded();  
      const hasPresaleEnded = presaleEndTime.lt(Math.floor(Date.now()/1000))
      if(hasPresaleEnded) {
        setPresaleEnded(true)
      } else {
        setPresaleEnded(false)
      }
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const owner = await nftContract.owner();
      const signer = await getProviderOrSigner(true);

      const userAddress = await signer.getAddress();

      if(owner.toLowerCase() === userAddress.toLowerCase()) {
        setIsOwner(true)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const getNumMintedTokens = async () => {
    try {
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      
      const numTokenIds = await nftContract.tokenIds();
      setNumTokensMinted(numTokenIds.toString())
    } catch (error) {
      console.error(error)
    }
  }

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();

    if (chainId !== 11155111) {
      window.alert("Change the network to Sepolia");
      throw new Error("Change network to Sepolia");
    }

    if(needSigner) {
      const signer = web3Provider.getSigner();
      return signer
    }
    return web3Provider;
  }

  useEffect(() => {
    if(!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "sepolia",
        providerOptions: {},
        disableInjectedProvider: false
      });
      connectWallet();

      const presaleStarted = checkIfPresaleStarted();
      if(presaleStarted) {
        checkIfPresaleEnded()
      }

      getNumMintedTokens();

      const presaleEndedInterval = setInterval(async function () {
        const presaleStarted = await checkIfPresaleStarted();
        if(presaleStarted) {
          const presaleEnded = await checkIfPresaleEnded();
          if(presaleEnded){
            clearInterval(presaleEndedInterval)
          }
        }
      }, 5 * 1000);

      setInterval(async function () {
        await getNumMintedTokens();
      }, 5 * 1000);

    }
  }, [walletConnected]);

  const renderButton = () => {

    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your wallet
        </button>
      );
    }


    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }


    if (isOwner && !presaleStarted) {
      return (
        <button className={styles.button} onClick={startPresale}>
          Start Presale!
        </button>
      );
    }

    if (!presaleStarted) {
      return (
        <div>
          <div className={styles.description}>Presale hasn&#39;t started!</div>
        </div>
      );
    }


    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className={styles.description}>
            Presale has started!!! If your address is whitelisted, Mint a Crypto
            Dev 🥳
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }

  
    if (presaleStarted && presaleEnded) {
      return (
        <button className={styles.button} onClick={publicMint}>
          Public Mint 🚀
        </button>
      );
    }
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs NFT</title>
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to CryptoDevs NFT</h1>
          <div className={styles.description}>CryptoDevs NFT is a collection for developers in web3</div>
          <div className={styles.description}>{numTokensMinted}/20 have been minted already</div>
          {renderButton()}
        </div>
        <img className={styles.image} src='/cryptodevs/0.svg' />
      </div>
      <footer className={styles.footer}> Made with &#10084; by Crypto Devs</footer>
    </div>
  )
}
