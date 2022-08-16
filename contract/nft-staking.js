import * as anchor from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import {
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getAccount, getMint } from "@solana/spl-token";
import { isValidSolanaAddress } from "@nfteyez/sol-rayz";

import {
    PROGRAM_ID,
} from './constants';
import {
    getPoolKey,
    getUserStateKey,
} from './keys';

import BigNumber from 'bignumber.js';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';

const IDL = require('./snug_squad');

export const getProgram = (wallet, connection) => {
    let provider = new anchor.AnchorProvider(
        connection,
        wallet,
        anchor.AnchorProvider.defaultOptions()
    );
    const program = new anchor.Program(IDL, PROGRAM_ID, provider);
    return program;
};


export const unstakeOneNftInDaemon = async (wallet, connection, userPk, stakeInfoPk, nftMint) => {
    // console.log("On Unstake NFT");
    const program = getProgram(wallet, connection);
    try {
        const ix = await program.methods.adminWithdrawNft().accounts({
            admin: wallet.publicKey,
            poolAccount: await getPoolKey(),
            userState: await getUserStateKey(userPk),
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

    return { stakedInfo: stakedInfo, unStakedInfo: unStakedInfo };
}
