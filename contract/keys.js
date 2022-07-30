import { PublicKey } from "@solana/web3.js";
import {
    RS_PREFIX,
    RS_STAKEINFO_SEED,
    RS_STAKE_SEED,
    RS_VAULT_SEED,
    PROGRAM_ID,
    REWARD_TOKEN_MINT,
    USER_STATE_SEED
} from "./constants"

/** Get NFT Staking Account Keys  */

export const getPoolKey = async () => {
    const [poolKey] = await asyncGetPda(
        [Buffer.from(RS_PREFIX)],
        PROGRAM_ID
    );
    return poolKey;
};

export const getRewardVaultKey = async () => {
    const [rewardVaultKey] = await asyncGetPda(
        [
            Buffer.from(RS_VAULT_SEED),
            REWARD_TOKEN_MINT.toBuffer()
        ],
        PROGRAM_ID
    );
    console.log('reward vault key : ', rewardVaultKey.toBase58());
    return rewardVaultKey;
};

export const getStakedNFTKey = async (
    nftMintPk
) => {
    const [stakedNftKey] = await asyncGetPda(
        [
            Buffer.from(RS_STAKE_SEED),
            nftMintPk.toBuffer()
        ],
        PROGRAM_ID
    );
    return stakedNftKey;
};

export const getStakeInfoKey = async (
    nftMintPk
) => {
    const [stakedNftKey] = await asyncGetPda(
        [
            Buffer.from(RS_STAKEINFO_SEED),
            nftMintPk.toBuffer()
        ],
        PROGRAM_ID
    );
    return stakedNftKey;
};


export const getUserStateKey = async (
    walletPk
) => {
    const [pk] = await asyncGetPda(
        [
            Buffer.from(USER_STATE_SEED),
            walletPk.toBuffer()
        ],
        PROGRAM_ID
    );
    return pk;
};


const asyncGetPda = async (
    seeds,
    programId
) => {
    const [pubKey, bump] = await PublicKey.findProgramAddress(seeds, programId);
    return [pubKey, bump];
};