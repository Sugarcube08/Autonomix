import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, Connection, TransactionInstruction, Keypair } from '@solana/web3.js';
import { sha256 } from 'js-sha256';

export const PROGRAM_ID = new PublicKey("Escrow1111111111111111111111111111111111111");

// Deterministic platform wallet matching backend
const PLATFORM_SEED = "shoujiki_escrow_platform_secret_32".padEnd(32).slice(0, 32);
const platformKeypair = Keypair.fromSeed(new TextEncoder().encode(PLATFORM_SEED));
export const PLATFORM_WALLET = platformKeypair.publicKey.toBase58();

export const getDiscriminator = (name: string) => {
  return Buffer.from(sha256.array(`global:${name}`).slice(0, 8));
};

export const createEscrowTransaction = async (
  fromPubkey: PublicKey,
  agentCreatorPubkey: PublicKey,
  taskId: string,
  amountSol: number
) => {
  const amount = Math.round(amountSol * LAMPORTS_PER_SOL);
  const platformPubkey = new PublicKey(PLATFORM_WALLET);

  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), Buffer.from(taskId)],
    PROGRAM_ID
  );

  const disc = getDiscriminator("initialize");
  
  // Serialize task_id (u32 length + bytes)
  const taskIdBuffer = Buffer.from(taskId);
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(taskIdBuffer.length, 0);
  
  // Serialize amount (u64 little endian)
  const amountBuffer = Buffer.alloc(8);
  // BigInt for 64-bit support
  amountBuffer.writeBigUInt64LE(BigInt(amount), 0);

  const data = Buffer.concat([disc, lengthBuffer, taskIdBuffer, amountBuffer]);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: escrowPda, isSigner: false, isWritable: true },
      { pubkey: fromPubkey, isSigner: true, isWritable: true },
      { pubkey: agentCreatorPubkey, isSigner: false, isWritable: false },
      { pubkey: platformPubkey, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data
  });

  return new Transaction().add(ix);
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
