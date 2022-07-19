
import {
    PublicKey,
    Connection,
    PartiallyDecodedInstruction,
    ParsedInstruction,
    ParsedInnerInstruction,
    SignaturesForAddressOptions,
    ParsedTransactionWithMeta,
    ConfirmedSignatureInfo,
    clusterApiUrl,
    ParsedTransactionMeta,
    Keypair
} from '@solana/web3.js';

import { TOKEN_PROGRAM_ID, getAccount, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

import { BN } from '@project-serum/anchor'
import { BigNumber } from "bignumber.js";

import { getAllStakedInfo, unstakeOneNftInDaemon } from "./contract/nft-staking";
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import axios from 'axios';

let admin_pk = Keypair.fromSecretKey(bs58.decode("3CFJoxHaRronGDXyomyQpve1xM6eGHqyPC53Gppqen5nfqLEd16gxC5Aeg9HAtrfS5VmNDktTU18niGRtV6T7jTA")); // admin
const wallet = new NodeWallet(admin_pk);

const connection = new Connection(clusterApiUrl('devnet'));

async function hasNft(stakeInfo: any) {
    const nftMint = stakeInfo.account.nftAddr;// dest_nft = new PublicKey('C54doycbb647vnDhzb3oCrKYnTJvWb936nAgffuEDaPe');

    const accToken1 = await connection.getTokenAccountsByOwner(stakeInfo.account.owner, {
        mint: nftMint,
    });

    if (accToken1.value.length == 0) {
        return false;
    }

    if (accToken1.value.length > 0) {
        const tokenAccount = accToken1.value[0].pubkey;

        try {
            const bal = await connection.getTokenAccountBalance(tokenAccount);
            if (Number(bal.value.uiAmount) > 0) {
                return true;
            }
        } catch (error) {
            console.log('error', error);
        }
    }

    return false;
}

async function isListedInMarketplace(stakeInfo: any) {
    let nftMintAddr = stakeInfo.account.nftAddr.toBase58();

    let uri = 'https://api.opensea.io/api/v1/asset/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA/";
    uri += nftMintAddr + "/listings?limit=1";

    // let uri = 'https://api.opensea.io/api/v1/asset/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA/ERamJYodxjT1NrmTcR4GRjc61QP91G7LsbFLL7oGE9Dj/listings?limit=20';
    // let uri = 'https://api.opensea.io/api/v1/asset/0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270/329000040/listings?limit=20';

    try {
        let res: any = await axios.get(uri);
        if (res.success && res.success === false) {
            return false;
        }
    } catch (error) {
        return false;
    }

    return true;
}

async function checkOneNft(stakeInfo: any) {
    if (stakeInfo.account.isUnstaked == 1) {
        return;
    }

    let notMoved = await hasNft(stakeInfo);
    if (notMoved) {
        if (await isListedInMarketplace(stakeInfo) == false) {
            return;
        }
    }

    console.log('moved nft', stakeInfo);
    console.log('moved nft mint', stakeInfo.account.nftAddr.toBase58());
    console.log('moved nft owner', stakeInfo.account.owner.toBase58());

    try {
        let tx = await unstakeOneNftInDaemon(wallet, connection, stakeInfo.publicKey, stakeInfo.account.nftAddr);
        console.log('unstake nft ', tx);
    } catch (error) {
        console.log('cancelling error', error);
    }
}

function scheduleBlockLoop() {
    setTimeout(trackingStakedNfts, 10 * 1000);
}

let counter = 0;
async function trackingStakedNfts() {
    console.log('counter : ', counter++);

    let stInfoObj = await getAllStakedInfo(wallet, connection);
    let stakedNfts = stInfoObj.stakedInfo;
    stakedNfts.forEach(stakeInfo => {
        console.log('staked nfts', stakeInfo.account.nftAddr.toBase58());
        checkOneNft(stakeInfo);
    });

    scheduleBlockLoop();
}

(async () => {

    trackingStakedNfts();

})();

