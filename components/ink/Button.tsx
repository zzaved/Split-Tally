import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-sans font-medium " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-200 " +
  "disabled:pointer-events-none disabled:opacity-45 active:translate-y-px " +
  "whitespace-nowrap";

const VARIANT: Record<Variant, string> = {
  primary: "bg-cobalt text-cream shadow-ink-sm hover:bg-navy",
  secondary:
    "border border-cobalt/35 text-cobalt hover:border-cobalt hover:bg-cobalt/6",
  ghost: "text-ink-soft hover:text-navy hover:bg-navy/5",
  danger: "border border-vermilion/40 text-vermilion hover:bg-vermilion/8 hover:border-vermilion",
};

const SIZE: Record<Size, string> = {
  // 40px rather than 32: a secondary action is still a thumb target.
  sm: "h-10 px-4 text-12 tracking-[0.06em]",
  md: "h-11 px-6 text-14",
  lg: "h-13 px-8 text-16",
};

type Common = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: Common & ComponentProps<"button">) {
  return (
    <button className={cn(BASE, VARIANT[variant], SIZE[size], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(BASE, VARIANT[variant], SIZE[size], className)} {...props}>
      {children}
    </Link>
  );
}
