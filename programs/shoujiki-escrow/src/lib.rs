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
        escrow.platform_authority = ctx.accounts.platform_authority.key();
        escrow.amount = amount;
        escrow.task_id = task_id;
        escrow.status = EscrowStatus::Locked;
        escrow.poae_hash = None;
        escrow.challenge_period_end = 0;

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

    /// VACN Phase 3: Submit PoAE and initiate Optimistic Challenge Period.
    pub fn submit_poae(ctx: Context<SettleEscrow>, success: bool, poae_hash: [u8; 32]) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        require!(escrow.status == EscrowStatus::Locked, EscrowError::AlreadyProposed);

        escrow.poae_hash = Some(poae_hash);
        escrow.success_proposed = success;
        escrow.status = EscrowStatus::Verifying;
        
        // 5 minute challenge window for VACN Verifier Nodes
        let now = Clock::get()?.unix_timestamp;
        escrow.challenge_period_end = now + 300; 

        emit!(PoAESubmitted {
            task_id: escrow.task_id.clone(),
            poae_hash,
            challenge_period_end: escrow.challenge_period_end,
        });

        Ok(())
    }

    /// VACN Phase 3: Finalize settlement after challenge window expires.
    pub fn finalize_settlement(ctx: Context<FinalizeEscrow>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        
        require!(escrow.status == EscrowStatus::Verifying, EscrowError::NotVerifying);
        
        let now = Clock::get()?.unix_timestamp;
        require!(now >= escrow.challenge_period_end, EscrowError::ChallengePeriodActive);

        if escrow.success_proposed {
            // Transfer to Agent Creator
            let escrow_info = ctx.accounts.escrow.to_account_info();
            let creator_info = ctx.accounts.agent_creator.to_account_info();
            
            **escrow_info.try_borrow_mut_lamports()? -= escrow.amount;
            **creator_info.try_borrow_mut_lamports()? += escrow.amount;
            escrow.status = EscrowStatus::Released;
        } else {
            // Refund to User
            let escrow_info = ctx.accounts.escrow.to_account_info();
            let user_info = ctx.accounts.user.to_account_info();

            **escrow_info.try_borrow_mut_lamports()? -= escrow.amount;
            **user_info.try_borrow_mut_lamports()? += escrow.amount;
            escrow.status = EscrowStatus::Refunded;
        }

        emit!(EscrowSettled {
            task_id: escrow.task_id.clone(),
            success: escrow.success_proposed,
            poae_hash: escrow.poae_hash.unwrap_or([0; 32]),
            settlement_timestamp: now,
        });

        Ok(())
    }
}

#[event]
pub struct PoAESubmitted {
    pub task_id: String,
    pub poae_hash: [u8; 32],
    pub challenge_period_end: i64,
}

#[event]
pub struct EscrowSettled {
    pub task_id: String,
    pub success: bool,
    pub poae_hash: [u8; 32],
    pub settlement_timestamp: i64,
}

#[derive(Accounts)]
#[instruction(amount: u64, task_id: String)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 32 + 8 + 4 + task_id.len() + 1 + (1 + 32) + 1 + 8,
        seeds = [b"escrow", task_id.as_bytes()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: Recipient
    pub agent_creator: AccountInfo<'info>,
    /// The authorized sequencer/verifier
    pub platform_authority: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.task_id.as_bytes()],
        bump,
        has_one = platform_authority,
    )]
    pub escrow: Account<'info, EscrowAccount>,
    pub platform_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FinalizeEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.task_id.as_bytes()],
        bump,
        has_one = user,
        has_one = agent_creator,
        close = user
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    /// CHECK: Recipient of rent
    pub user: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: Recipient of funds if success
    pub agent_creator: AccountInfo<'info>,
}

#[account]
pub struct EscrowAccount {
    pub user: Pubkey,
    pub agent_creator: Pubkey,
    pub platform_authority: Pubkey,
    pub amount: u64,
    pub task_id: String,
    pub status: EscrowStatus,
    pub poae_hash: Option<[u8; 32]>,
    pub success_proposed: bool,
    pub challenge_period_end: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowStatus {
    Locked,
    Verifying,
    Released,
    Refunded,
}

#[error_code]
pub enum EscrowError {
    #[msg("Escrow has already been settled or proposed")]
    AlreadyProposed,
    #[msg("Escrow is not in verifying state")]
    NotVerifying,
    #[msg("Challenge period is still active")]
    ChallengePeriodActive,
}
