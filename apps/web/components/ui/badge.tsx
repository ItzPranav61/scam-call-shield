import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

// Outline/icon treatments inspired by Origin UI; existing default stays intact.
const badgeVariants = cva('inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border text-xs font-medium [&_svg]:size-3.5 [&_svg]:shrink-0', {
  variants: {
    variant: {
      secondary: 'rounded-full border-border bg-secondary text-secondary-foreground',
      outline: 'rounded-full border-border bg-background text-foreground shadow-[0_1px_2px_#123e2e06]',
      brand: 'rounded-xl border-primary bg-primary text-primary-foreground shadow-[inset_0_1px_0_#ffffff24,0_2px_4px_#123e2e12] [&_svg]:size-5',
    },
    size: {
      default: 'px-3 py-1',
      lg: 'min-h-9 px-3.5 py-1.5',
      icon: 'size-10 p-0',
    },
  },
  defaultVariants: { variant: 'secondary', size: 'default' },
});

export function Badge({ className, variant, size, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
