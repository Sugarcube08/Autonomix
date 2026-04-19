import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';

export const PLATFORM_WALLET = process.env.NEXT_PUBLIC_PLATFORM_WALLET || "4FqQ5S8C6Tf5C9v9A5M2B2F2G2H2J2K2L2M2N2P2Q2R";

export const createPaymentTransaction = async (
  fromPubkey: PublicKey,
  amount: number
) => {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey: new PublicKey(PLATFORM_WALLET),
      lamports: amount * LAMPORTS_PER_SOL,
    })
  );
  return transaction;
};

export const confirmTx = async (connection: Connection, signature: string) => {
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: signature,
  }, 'confirmed');
  return true;
};
