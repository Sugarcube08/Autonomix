import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Connection, Keypair, TransactionInstruction } from '@solana/web3.js';
import { encodeURL } from '@solana/pay';
import BigNumber from 'bignumber.js';

// Squads V4 Program ID
const SQUADS_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_SQUADS_PROGRAM_ID || "SQDS4Byj9s7BfR7atvH9iSnduXW1U9CAdX9rW5L2S8X");

// Default platform wallet (will be overridden by config if possible)
export let PLATFORM_WALLET = "H1GKFJGLNPwYKd6ZXx2bcHJ8ahtD1sszkuMbGASXzPP6";

export const setPlatformWallet = (address: string) => {
  PLATFORM_WALLET = address;
};

const ESCROW_PROGRAM_ID = new PublicKey("SHoujikiEscrow11111111111111111111111111111");

export const createEscrowTransaction = async (
  fromPubkey: PublicKey,
  agentCreatorPubkey: PublicKey,
  taskId: string,
  amountSol: number
) => {
  const amount = Math.round(amountSol * LAMPORTS_PER_SOL);

  // 1. Derive Escrow PDA
  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), Buffer.from(taskId)],
    ESCROW_PROGRAM_ID
  );

  // 2. Construct instruction data
  // Anchor discriminator: sha256("global:initialize_escrow").slice(0, 8)
  const discriminator = Buffer.from([0xd9, 0x34, 0x27, 0x95, 0x43, 0xe4, 0x98, 0xc4]);
  
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(amount));
  
  const taskBuffer = Buffer.from(taskId);
  const taskLenBuffer = Buffer.alloc(4);
  taskLenBuffer.writeUInt32LE(taskBuffer.length);
  
  const data = Buffer.concat([discriminator, amountBuffer, taskLenBuffer, taskBuffer]);

  const ix = new TransactionInstruction({
    programId: ESCROW_PROGRAM_ID,
    keys: [
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: fromPubkey, isSigner: true, isWritable: true },
      { pubkey: agentCreatorPubkey, isSigner: false, isWritable: false },
      { pubkey: new PublicKey(PLATFORM_WALLET), isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  const tx = new Transaction().add(ix);
  
  // Return escrowPda as the reference for backend verification
  return { tx, reference: escrowPda };
};

export const createSolanaPayURL = (recipient: PublicKey, amount: number, reference: PublicKey, label: string, message: string) => {
  const url = encodeURL({
    recipient,
    amount: new BigNumber(amount),
    reference,
    label,
    message,
  });
  return url;
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
