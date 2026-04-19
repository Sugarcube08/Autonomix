import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn('bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden', className)}>
    {children}
  </div>
);

export const CardHeader = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn('p-6 border-b border-zinc-800', className)}>
    {children}
  </div>
);

export const CardContent = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn('p-6', className)}>
    {children}
  </div>
);

export const CardFooter = ({ className, children }: { className?: string, children: React.ReactNode }) => (
  <div className={cn('p-6 bg-zinc-900/50 border-t border-zinc-800', className)}>
    {children}
  </div>
);
