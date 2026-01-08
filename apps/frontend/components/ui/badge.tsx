'use client';

/**
 * Badge Component
 * shadcn-style badge with variants
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-background-secondary text-text-primary',
        primary: 'bg-primary-light text-primary-dark',
        secondary: 'bg-background-secondary text-text-secondary',
        success: 'bg-success-light text-success',
        warning: 'bg-warning-light text-warning',
        destructive: 'bg-destructive-light text-destructive',
        outline: 'border border-border text-text-secondary bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
