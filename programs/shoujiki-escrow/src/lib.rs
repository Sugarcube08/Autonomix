use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke;

declare_id!("SHoujikiEscrow11111111111111111111111111111");

#[program]
pub mod shoujiki_escrow {
    use super::*;

    pub fn initialize_escrow(ctx: Context<InitializeEscrow>, amount: u64, task_id: String) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.user = ctx.accounts.user.key();
        escrow.agent_creator = ctx.accounts.agent_creator.key();
        escrow.amount = amount;
        escrow.task_id = task_id;
        escrow.status = EscrowStatus::Locked;
        escrow.poe_hash = None;

        // Transfer SOL to escrow PDA
        let ix = system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.escrow.key(),
            amount,
        );
        invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        Ok(())
    }

    pub fn release_funds(ctx: Context<SettleEscrow>, success: bool, poe_hash: [u8; 32]) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        // AgentOS Protocol: The poe_hash is the cryptographic commitment to the 
        // verifiable execution performed in the Confidential VM (Arcium/TEE).
        escrow.poe_hash = Some(poe_hash);

        if success {
            // Transfer escrowed amount from Escrow PDA to Agent Creator
            let escrow_info = ctx.accounts.escrow.to_account_info();
            let creator_info = ctx.accounts.agent_creator.to_account_info();
            
            **escrow_info.try_borrow_mut_lamports()? -= escrow.amount;
            **creator_info.try_borrow_mut_lamports()? += escrow.amount;
            escrow.status = EscrowStatus::Released;
        } else {
            // Refund escrowed amount to User
            let escrow_info = ctx.accounts.escrow.to_account_info();
            let user_info = ctx.accounts.user.to_account_info();

            **escrow_info.try_borrow_mut_lamports()? -= escrow.amount;
            **user_info.try_borrow_mut_lamports()? += escrow.amount;
            escrow.status = EscrowStatus::Refunded;
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(amount: u64, task_id: String)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 8 + 4 + task_id.len() + 1 + (1 + 32),
        seeds = [b"escrow", task_id.as_bytes()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: Recipient of funds
    pub agent_creator: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.task_id.as_bytes()],
        bump,
        has_one = agent_creator,
        has_one = user,
        close = user // Returns rent-exempt lamports to the original user
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    /// CHECK: Handled by has_one
    pub user: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: Handled by has_one
    pub agent_creator: AccountInfo<'info>,
    /// The Platform Authority acts as the PoE Attestor/Sequencer in the current version.
    pub platform_authority: Signer<'info>,
}

#[account]
pub struct EscrowAccount {
    pub user: Pubkey,
    pub agent_creator: Pubkey,
    pub amount: u64,
    pub task_id: String,
    pub status: EscrowStatus,
    pub poe_hash: Option<[u8; 32]>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowStatus {
    Locked,
    Released,
    Refunded,
}

#[error_code]
pub enum EscrowError {
    #[msg("Escrow has already been settled")]
    AlreadySettled,
}
