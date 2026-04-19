import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = ({ className, label, error, ...props }: InputProps) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-zinc-400 ml-1">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500 transition-colors disabled:opacity-50',
          error && 'border-red-500 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = ({ className, label, error, ...props }: TextAreaProps) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-zinc-400 ml-1">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          'w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500 transition-colors disabled:opacity-50 min-h-[100px]',
          error && 'border-red-500 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
    </div>
  );
};
