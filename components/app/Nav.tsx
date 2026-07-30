"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", short: "Home" },
  { href: "/friends", label: "Friends", short: "Friends" },
  { href: "/exchange", label: "Exchange", short: "Exchange" },
  { href: "/money", label: "Money", short: "Money" },
  { href: "/activity", label: "Activity", short: "Activity" },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop navigation, sitting in the top bar beside the wordmark. */
export function TopNav() {
  const isActive = useIsActive();

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "eyebrow rounded-full px-3.5 py-2 transition-colors duration-150",
              active ? "bg-cobalt/8 text-cobalt" : "text-ink-soft hover:text-navy",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Below 768px the same five destinations become a bottom tab bar. */
export function BottomTabs() {
  const isActive = useIsActive();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-navy/10 bg-cream/95 backdrop-blur-[2px] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-3 transition-colors duration-150",
                  active ? "text-cobalt" : "text-ink-soft",
                )}
              >
                <TabGlyph href={item.href} active={active} />
                <span className="eyebrow text-[9px] tracking-[0.14em]">{item.short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Hand-drawn tab glyphs in the same ink language as the rest of the system —
 * a tally group, two figures, a split stick, a coin stack, a stroke stack.
 */
function TabGlyph({ href, active }: { href: string; active: boolean }) {
  const stroke = { stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const };
  const opacity = active ? 1 : 0.75;

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5" opacity={opacity}>
      {href === "/dashboard" && (
        <g {...stroke}>
          <path d="M5 6C4 10 6 14 5 18" />
          <path d="M10 6C11 10 9 14 10 18" />
          <path d="M15 6C14 10 16 14 15 18" />
          <path d="M3 17C8 14 14 10 20 6" />
        </g>
      )}
      {href === "/friends" && (
        <g {...stroke}>
          <path d="M8.5 10.5C10.4 10.5 11.6 8.9 11.6 7.2C11.6 5.6 10.4 4.5 8.5 4.5C6.7 4.5 5.5 5.6 5.5 7.2C5.5 8.9 6.7 10.5 8.5 10.5Z" />
          <path d="M3 19C3.4 15.4 5.6 13.3 8.5 13.3C11.4 13.3 13.6 15.4 14 19" />
          <path d="M15.5 6.2C17.2 5.9 18.6 7 18.7 8.6C18.8 10.2 17.7 11.4 16.2 11.5" />
          <path d="M17 14C19.3 14.6 20.7 16.3 21 19" />
        </g>
      )}
      {href === "/exchange" && (
        <g {...stroke}>
          <path d="M4 8H17" />
          <path d="M14 5L17.5 8L14 11" />
          <path d="M20 16H7" />
          <path d="M10 13L6.5 16L10 19" />
        </g>
      )}
      {href === "/money" && (
        <g {...stroke}>
          <path d="M4 18C6 14.5 8.5 12 12 9.5C15 7.4 17.5 6.4 20 6" />
          <path d="M15.5 5.6L20.2 5.9L20 10.6" />
          <path d="M4 20.5H20" />
        </g>
      )}
      {href === "/activity" && (
        <g {...stroke}>
          <path d="M4 7C9 5.5 15 8.5 20 7" />
          <path d="M4 12C9 10.5 15 13.5 20 12" />
          <path d="M4 17C9 15.5 15 18.5 20 17" />
        </g>
      )}
    </svg>
  );
}
