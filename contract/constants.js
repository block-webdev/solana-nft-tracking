import { PublicKey } from "@solana/web3.js";

/** GLOBAL CONSTANT */

export const Networks = {
    MAINNET: 101,
    DEVNET: 102
}
// export const DEFAULT_NETWORK = Networks.MAINNET;
export const DEFAULT_NETWORK = Networks.DEVNET;
export const IS_MAINNET = DEFAULT_NETWORK == Networks.MAINNET;
export const NETWORK = IS_MAINNET ? "mainnet-beta" : "devnet";

export const SECONDS_PER_DAY = 24 * 60 * 60;

export const RS_PREFIX = "snuggle-squad-nft-staking";
export const RS_STAKEINFO_SEED = "snuggle-squad-stake-info";
export const RS_STAKE_SEED = "snuggle-squad-nft-staking";
export const RS_VAULT_SEED = "snuggle-squad-vault";

export const CLASS_TYPES = [10, 15, 25];
export const LOCK_DAY = [0, 14, 30];
export const REWARDS_BY_RARITY = [0, 3, 6, 10, 15];

/** NFT Staking Constant */

export const REWARD_TOKEN_MINT = new PublicKey(
    IS_MAINNET ?
    "ExLjCck16LmtH87hhCAmTk4RWv7getYQeGhLvoEfDLrH" :
    "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr" // USDC
)

export const NFT_CREATOR = new PublicKey(
    IS_MAINNET ? 
    "6rQse6Jq81nBork8x9UwccJJh4qokVVSYujhQRuQgnna" : 
    "HvAoCHHJ2jU6EgBjyQ5C3pYKKvDARiXsnjYqfoTgJf7A"//"2sN9NsV6sSeA3h1qcN5ZcV4gRQYABebJymc5uzLsiPdY"
);

export const PROGRAM_ID = new PublicKey(
    IS_MAINNET ? 
    "6RhXNaW1oQYQmjTc1ypb4bEFe1QasPAgEfFNhQ3HnSqo" : 
    "2dw47d5KvhgyiKtAhJhJGn2d3RbfqD1QBk6qZT8NERbg"
)

export const INITIALIZER = new PublicKey(
    IS_MAINNET ? 
    "7etbqNa25YWWQztHrwuyXtG39WnAqPszrGRZmEBPvFup" : 
    "GTVhUEjJ2wpVAQuctQHqnL1FF5cciYreQ1qrw6mw8QXh"
)

// console.log("*********", IS_MAINNET, NETWORK, SWRD_TOKEN_MINT.toBase58());