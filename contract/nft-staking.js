import * as anchor from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import {
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getAccount, getMint } from "@solana/spl-token";
import { isValidSolanaAddress } from "@nfteyez/sol-rayz";

import {
    REWARD_TOKEN_MINT,
    CLASS_TYPES,
    PROGRAM_ID,
    SECONDS_PER_DAY,
    LOCK_DAY,
    REWARDS_BY_RARITY,
} from './constants';
import {
    getPoolKey,
    getRewardVaultKey,
    getStakedNFTKey,
    getStakeInfoKey,
} from './keys';
import {
    getMultipleTransactions,
    sendMultiTransactions,
    getNftMetadataURI,
    getTokenAccount,
    getNFTTokenAccount,
    getAssociatedTokenAccount,
} from './utils';

import BigNumber from 'bignumber.js';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';

const IDL = require('./snug_squad');
const rarityList = require('./rarity');

export const getProgram = (wallet, connection) => {
    let provider = new anchor.AnchorProvider(
        connection,
        wallet,
        anchor.AnchorProvider.defaultOptions()
    );
    const program = new anchor.Program(IDL, PROGRAM_ID, provider);
    return program;
};


export const initProject = async (wallet, connection) => {
    // console.log("On init click");
    const program = getProgram(wallet, connection);

    const res = await program.methods.initialize(CLASS_TYPES, LOCK_DAY, REWARDS_BY_RARITY).accounts({
        admin: wallet.publicKey,
        poolAccount: await getPoolKey(),
        rewardMint: REWARD_TOKEN_MINT,
        rewardVault: await getRewardVaultKey(),
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
    }).rpc();
    console.log("Your transaction signature : ", res);
}

const getRarityFromRank = async (rank) => {
    // if (2723 <= rank && rank <= 7777) {
    //     return 0; // common
    // }
    // if (1168 <= rank && rank <= 2722) {
    //     return 1; // uncommon
    // }
    // if (390 <= rank && rank <= 1167) {
    //     return 2; // rare
    // }
    // if (79 <= rank && rank <= 389) {
    //     return 3; // legendary
    // }
    // if (1 <= rank && rank <= 78) {
    //     return 4; // mythic
    // }
    if (30 <= rank && rank <= 7777) {
        return 0; // common
    }
    if (15 <= rank && rank <= 29) {
        return 1; // uncommon
    }
    if (10 <= rank && rank <= 14) {
        return 2; // rare
    }
    if (6 <= rank && rank <= 9) {
        return 3; // legendary
    }
    if (1 <= rank && rank <= 5) {
        return 4; // mythic
    }

    return 0;
}

export const getRarityFromMint = async (mintKeyText) => {
    const nftMintPk = new PublicKey(mintKeyText);

    let rarityObj = rarityList.mints.find(ele => nftMintPk.equals(new PublicKey(ele.mint)));
    let rarity = rarityObj ? getRarityFromRank(rarityObj.rank) : 0;

    return rarity;
}

export const stakeNft = async (wallet, connection, selectedNftMint, poolID) => {
    // console.log("On stake NFT");
    const program = getProgram(wallet, connection);

    let instructions = [];
    for (let i = 0; i < selectedNftMint.length; i++) {
        const nftMintPk = new PublicKey(selectedNftMint[i].mint);

        // let uri = await getNftMetadataURI(nftMintPk);
        // let tokenId = await getNftTokenId(uri);
        let nftClass = poolID;//getNftClass(poolID);

        if (nftClass < 0) return;
        // console.log("token URI : ", uri);
        // console.log("token Class : ", nftClass);

        let rarity = selectedNftMint[i].rarity;
        console.log('rarity : ', i, rarity);

        const ix = await program.methods.stakeNft(nftClass, rarity).accounts({
            owner: wallet.publicKey,
            poolAccount: await getPoolKey(),
            nftMint: nftMintPk,
            userNftTokenAccount: await getNFTTokenAccount(connection, nftMintPk),
            destNftTokenAccount: await getStakedNFTKey(nftMintPk),
            nftStakeInfoAccount: await getStakeInfoKey(nftMintPk),
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
        }).instruction();
        instructions.push(ix);
        // console.log("Your transaction signature : ", res);
    }

    let instructionSet = await getMultipleTransactions(connection, wallet, instructions);
    let res = await sendMultiTransactions(connection, wallet, instructionSet);
    // console.log('txHash =', res);
    return res;
}

export const unstakeOneNftInDaemon = async (wallet, connection, stakeInfoPk, nftMint) => {
    // console.log("On Unstake NFT");
    const program = getProgram(wallet, connection);
    try {
        const ix = await program.methods.withdrawNft().accounts({
            owner: wallet.publicKey,
            poolAccount: await getPoolKey(),
            nftMint: nftMint,
            nftStakeInfoAccount: stakeInfoPk,
        })
        .signers([wallet.payer])
        .rpc();
        
        console.log('txHash =', ix);
        return ix;
    } catch (error) {
        console.log('daemon withdraw error', error);
    }

    return null;
}

export const unstakeNft = async (wallet, connection, selectedNftMint) => {
    // console.log("On Unstake NFT");
    const program = getProgram(wallet, connection);

    let instructions = [];
    for (let i = 0; i < selectedNftMint.length; i++) {
        const nftMintPk = new PublicKey(selectedNftMint[i].mint);

        const ix = await program.methods.withdrawNft().accounts({
            owner: wallet.publicKey,
            poolAccount: await getPoolKey(),
            nftMint: nftMintPk,
            nftStakeInfoAccount: await getStakeInfoKey(nftMintPk),
        }).instruction();
        instructions.push(ix);
        // console.log("Your transaction signature", res);
    }

    let instructionSet = await getMultipleTransactions(connection, wallet, instructions);
    let res = await sendMultiTransactions(connection, wallet, instructionSet);
    // console.log('txHash =', res);
    return res;
}

export const getRewardTokenBalance = async (wallet, connection) => {
    if (!wallet || !wallet.publicKey) {
        return undefined;
    }

    const associatedTokenAccount = await getAssociatedTokenAddress(
        REWARD_TOKEN_MINT,
        wallet.publicKey
    );

    try {
        const accountInfo = await getAccount(connection, associatedTokenAccount);
        const mintInfo = await getMint(
            connection,
            REWARD_TOKEN_MINT
        );

        let bigAmount = new BigNumber(accountInfo.amount);
        let bigDecimal = new BigNumber(10 ** mintInfo.decimals);
        let rewardAmount = bigAmount.div(bigDecimal).toNumber();

        return rewardAmount;

    } catch (error) {
        console.log('get balance error', error);
    }

    return undefined;
}

export const depositReward = async (wallet, connection) => {
    const program = getProgram(wallet, connection);
    const txHash = await program.methods.depositReward(
        new anchor.BN(400_000_000)
    ).accounts(
        {
            funder: wallet.publicKey,
            rewardVault: await getRewardVaultKey(),
            funderAccount: await getAssociatedTokenAccount(wallet.publicKey, REWARD_TOKEN_MINT),
            poolAccount: await getPoolKey(),
            rewardMint: REWARD_TOKEN_MINT,
            tokenProgram: TOKEN_PROGRAM_ID,
        }
    ).rpc();

    console.log('txHash =', txHash);
}

export const claimReward = async (wallet, connection, params) => {
    // console.log("On claim reward");
    const program = getProgram(wallet, connection);

    let instructions = [];
    for (let i = 0; i < params.length; i++) {
        const nftMintPk = new PublicKey(params[i].mint);

        const ix = await program.methods.claimReward()
            .accounts(
                {
                    owner: wallet.publicKey,
                    poolAccount: await getPoolKey(),
                    nftStakeInfoAccount: await getStakeInfoKey(nftMintPk),
                    rewardMint: REWARD_TOKEN_MINT,
                    rewardVault: await getRewardVaultKey(),
                    rewardToAccount: await getAssociatedTokenAccount(wallet.publicKey, REWARD_TOKEN_MINT),
                    rent: SYSVAR_RENT_PUBKEY,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID,
                    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                    nftMint: nftMintPk,
                }
            ).instruction();
        instructions.push(ix);
    }

    let instructionSet = await getMultipleTransactions(connection, wallet, instructions);
    let res = await sendMultiTransactions(connection, wallet, instructionSet);
    // console.log('txHash =', res);
    return res;
}

export const getDailyRewards = (info) => {
    let reward = (CLASS_TYPES[info.classId] + REWARDS_BY_RARITY[info.rarityId]);
    return reward;
}

export const calculateRewards = (info) => {
    let currentTimeStamp = new Date().getTime() / 1000;
    let reward = (CLASS_TYPES[info.classId] + REWARDS_BY_RARITY[info.rarityId]) * (currentTimeStamp - info.lastUpdateTime) / SECONDS_PER_DAY;

    return reward;
}

export const getClaimableReward = (params) => {
    let reward = 0;
    params.map((item) => {
        reward += calculateRewards(item);
    });
    // console.log("#############################", reward);
    if (reward < 0) reward = 0;

    return reward.toFixed(2);
}

export const getAllStakedInfo = async (wallet, connection) => {
    const program = getProgram(wallet, connection);
    let res = await program.account.stakeInfo.all();

    let stakedInfo = [], unStakedInfo = [];
    res.forEach(ele => {
        if (ele.account.isUnstaked == 1) {
            unStakedInfo.push(ele);
        } else {
            stakedInfo.push(ele);
        }
    });

    console.log("Staked info : ", res);
    return { stakedInfo: stakedInfo, unStakedInfo: unStakedInfo };
}

export const getStakedInfo = async (wallet, connection) => {
    const program = getProgram(wallet, connection);
    let res = await program.account.stakeInfo.all(
        [
            {
                memcmp: {
                    offset: 12,
                    bytes: wallet.publicKey.toBase58()
                }
            }
        ]
    );

    let stakedInfo = [], unStakedInfo = [];
    res.forEach(ele => {
        if (ele.account.isUnstaked == 1) {
            unStakedInfo.push(ele);
        } else {
            stakedInfo.push(ele);
        }
    });

    console.log("Staked info : ", res);
    return { stakedInfo: stakedInfo, unStakedInfo: unStakedInfo };
}

const getNftTokenId = async (tokenURI) => {
    // console.log("token id =========================> ", tokenURI.properties.edition);
    return tokenURI?.properties?.edition;
}


const getNftClass = (tokenId) => {
    if (tokenId > 0 && tokenId <= 9) return 0;
    else if (tokenId > 9 && tokenId <= 150) return 1;
    else if (tokenId > 150 && tokenId <= 400) return 2;
    else if (tokenId > 400 && tokenId <= 700) return 3;
    else if (tokenId > 700 && tokenId <= 1100) return 4;
    else if (tokenId > 1100 && tokenId <= 1650) return 5;
    else if (tokenId > 1650 && tokenId <= 2350) return 6;
    else if (tokenId > 2350 && tokenId <= 3200) return 7;
    else if (tokenId > 3200) return 8;
    else return -1;
}

// export const showToast = (txt, ty) => {
//   let type = toast.TYPE.SUCCESS;
//   if (ty === 1) type = toast.TYPE.ERROR;
//   toast.error(txt, {
//     position: "bottom-left",
//     autoClose: 5000,
//     hideProgressBar: false,
//     closeOnClick: true,
//     pauseOnHover: true,
//     draggable: true,
//     progress: undefined,
//     type,
//     theme: 'colored'
//   });
// }
