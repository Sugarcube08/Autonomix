use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("iUapCgHuxJ76A86VQAh71nnYhAxPSgkT4Y41GS6n4RR");

#[program]
pub mod shoujiki_escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, task_id: String, amount: u64) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.maker = ctx.accounts.maker.key();
        escrow.agent_creator = ctx.accounts.agent_creator.key();
        escrow.platform = ctx.accounts.platform.key();
        escrow.amount = amount;
        escrow.task_id = task_id.clone();
        escrow.bump = ctx.bumps.escrow;

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.maker.to_account_info(),
                to: escrow.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, amount)?;

        Ok(())
    }

    pub fn resolve(ctx: Context<Resolve>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let amount = escrow.amount;

        let platform_share = amount / 10;
        let creator_share = amount - platform_share;

        **escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.agent_creator.to_account_info().try_borrow_mut_lamports()? += creator_share;
        **ctx.accounts.platform.to_account_info().try_borrow_mut_lamports()? += platform_share;

        Ok(())
    }

    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        let amount = escrow.amount;

        **escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.maker.to_account_info().try_borrow_mut_lamports()? += amount;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(task_id: String)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = maker,
        space = 8 + 32 + 32 + 32 + 8 + 4 + task_id.len() + 1,
        seeds = [b"escrow", task_id.as_bytes()],
        bump
    )]
    pub escrow: Account<'info, EscrowState>,
    #[account(mut)]
    pub maker: Signer<'info>,
    pub agent_creator: AccountInfo<'info>,
    pub platform: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Resolve<'info> {
    #[account(
        mut,
        has_one = agent_creator,
        has_one = platform,
        close = platform
    )]
    pub escrow: Account<'info, EscrowState>,
    #[account(mut)]
    pub platform: Signer<'info>,
    #[account(mut)]
    pub agent_creator: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(
        mut,
        has_one = maker,
        has_one = platform,
        close = platform
    )]
    pub escrow: Account<'info, EscrowState>,
    #[account(mut)]
    pub platform: Signer<'info>,
    #[account(mut)]
    pub maker: AccountInfo<'info>,
}

#[account]
pub struct EscrowState {
    pub maker: Pubkey,
    pub agent_creator: Pubkey,
    pub platform: Pubkey,
    pub amount: u64,
    pub task_id: String,
    pub bump: u8,
}
