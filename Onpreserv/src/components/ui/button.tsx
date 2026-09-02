import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-xs font-semibold uppercase tracking-wide ring-offset-background transition-all duration-300 ease-out-expo focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-300",
  {
    variants: {
      variant: {
        // Botão primário do Aetheris: mint sólido, texto void, halo mint,
        // e no hover a superfície vira branca.
        default:
          "bg-primary text-primary-foreground shadow-glow hover:bg-white hover:text-background hover:shadow-glow-strong",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-white hover:text-destructive",
        // Botão secundário do hero: superfície translúcida com borda branca.
        outline:
          "border border-white/20 bg-background/50 text-white backdrop-blur-md hover:border-white/40 hover:bg-white/10",
        secondary:
          "bg-white text-background hover:bg-primary",
        ghost: "font-medium normal-case tracking-normal text-muted-foreground hover:bg-accent hover:text-primary",
        // Botão "de instrumento": borda 1px que acende no mint (Aetheris).
        // Botão de instrumento: borda 1px que acende no mint.
        hud:
          "border border-border bg-transparent font-mono text-[10px] tracking-[0.15em] text-muted-foreground hover:border-primary hover:text-primary",
        link: "normal-case tracking-normal text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 px-4",
        lg: "h-11 px-10",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
