"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "./useInView";

/**
 * A short rise-in when content first scrolls into view. Disabled entirely
 * under prefers-reduced-motion by the `.rise` rules in globals.css.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  /** Seconds. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "p" | "span";
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <Tag
      ref={ref as never}
      className={cn("rise", inView && "rise--in", className)}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </Tag>
  );
}
