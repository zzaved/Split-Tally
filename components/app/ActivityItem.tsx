import { Avatar } from "@/components/ink/Card";
import { OrbGlyph } from "@/components/ink/Orb";
import { formatMoney, formatRelative } from "@/lib/format";
import type { Activity, Json, Profile } from "@/lib/types";
import { possessive } from "@/lib/utils";

/**
 * One line of the feed. Each type gets a sentence written out rather than a
 * templated blob, because this is the surface where people check the story of
 * their money (BUILD.MD §5.8).
 */
export function ActivityItem({
  item,
  profiles,
}: {
  item: Activity;
  profiles: Map<string, Profile>;
}) {
  const actor = item.actor_id ? profiles.get(item.actor_id) : undefined;
  const p = item.payload ?? {};
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);
  const num = (k: string) => (typeof p[k] === "number" ? (p[k] as number) : undefined);
  const money = (k: string) => formatMoney(num(k) ?? 0, str("currency") ?? "USD");

  const { text, ai } = describe(item.type, { str, num, money, actor: actor?.name });

  return (
    <li className="flex items-start gap-4 border-b border-navy/8 py-4 last:border-0">
      <span className="mt-0.5">
        <Avatar name={actor?.name ?? "?"} size={32} managed={actor?.is_managed} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-14 text-navy">
          {text}
          {ai && <OrbGlyph className="size-3" title="Created by the assistant" />}
        </p>
        <p className="mt-1 text-12 text-ink-soft">{formatRelative(item.created_at)}</p>
      </div>
    </li>
  );
}

type Ctx = {
  str: (k: string) => string | undefined;
  num: (k: string) => number | undefined;
  money: (k: string) => string;
  actor?: string;
};

function describe(type: Activity["type"], c: Ctx): { text: string; ai: boolean } {
  const who = c.actor ?? "Someone";
  const via = c.str("via");
  const ai = via === "voice" || via === "statement";

  switch (type) {
    case "expense_added":
      return {
        text: `${who} added ${c.str("description") ?? "an expense"} for ${c.money("amount")}${
          c.str("group") ? ` in ${c.str("group")}` : ""
        }.`,
        ai,
      };
    case "expense_removed":
      return {
        text: `${who} removed a tally: ${c.str("description") ?? "an expense"}.`,
        ai: false,
      };
    case "settlement":
      return {
        text: `${c.str("from") ?? who} settled ${c.money("amount")} with ${c.str("to") ?? "you"}${
          c.str("group") ? ` in ${c.str("group")}` : ""
        }.`,
        ai: false,
      };
    case "friend_request":
      return { text: `${c.str("name") ?? who} wants to connect with you.`, ai: false };
    case "friend_accepted":
      return { text: `You and ${c.str("name") ?? who} are now connected.`, ai: false };
    case "listing_created":
      return {
        text: `${who} listed ${possessive(c.str("debtor"))} tally of ${c.money("face_value")} for ${formatMoney(
          c.num("asking_price") ?? 0,
          c.str("currency") ?? "USD",
        )}.`,
        ai: true,
      };
    case "listing_sold":
      return {
        text: `${c.str("seller") ?? who} sold ${possessive(c.str("debtor"))} tally to ${
          c.str("buyer") ?? "a buyer"
        } for ${formatMoney(c.num("price") ?? 0, c.str("currency") ?? "USD")}.`,
        ai: false,
      };
    case "checkin_done":
      return { text: c.str("summary") ?? "You finished your weekly tally.", ai: true };
    case "simplify_applied":
      return {
        text: `${who} simplified ${c.str("group") ?? "a group"}: ${c.num("before") ?? 0} transfers became ${
          c.num("after") ?? 0
        }.`,
        ai: true,
      };
    default:
      return { text: "Something happened in your ledger.", ai: false };
  }
}

export type { Json };
