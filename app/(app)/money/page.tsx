import type { Metadata } from "next";
import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { ButtonLink } from "@/components/ink/Button";
import { Card, SectionHeading } from "@/components/ink/Card";
import { EmptyState } from "@/components/ink/EmptyState";
import { OrbGlyph } from "@/components/ink/Orb";
import { TallyMarks } from "@/components/ink/TallyMarks";
import { formatDate, formatMonth, formatMoney, parseDateOnly, round2 } from "@/lib/format";
import { getBudgets, getCheckins, getMyProfile, getPersonalTransactions } from "@/lib/data";
import { BudgetForm, BudgetRow } from "./BudgetRow";
import { Insights } from "./Insights";

export const metadata: Metadata = { title: "Money" };

const CATEGORY_MARKS = 12;

export default async function MoneyPage() {
  const [profile, transactions, budgets, checkins] = await Promise.all([
    getMyProfile(),
    getPersonalTransactions(),
    getBudgets(),
    getCheckins(),
  ]);

  if (!profile) return null;
  const currency = profile.currency;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const inMonth = transactions.filter((t) => t.date.startsWith(thisMonth));
  const income = round2(
    inMonth.filter((t) => t.direction === "in").reduce((sum, t) => sum + Number(t.amount), 0),
  );
  const spend = round2(
    inMonth.filter((t) => t.direction === "out").reduce((sum, t) => sum + Number(t.amount), 0),
  );

  const byCategory: Record<string, number> = {};
  for (const t of inMonth) {
    if (t.direction !== "out") continue;
    const key = t.category ?? "Other";
    byCategory[key] = round2((byCategory[key] ?? 0) + Number(t.amount));
  }
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const biggest = categories[0]?.[1] ?? 0;

  // Every month we have anything for, newest first.
  const months = new Map<string, { in: number; out: number }>();
  for (const t of transactions) {
    const key = t.date.slice(0, 7);
    const entry = months.get(key) ?? { in: 0, out: 0 };
    if (t.direction === "in") entry.in = round2(entry.in + Number(t.amount));
    else entry.out = round2(entry.out + Number(t.amount));
    months.set(key, entry);
  }

  const budgetMap = Object.fromEntries(budgets.map((b) => [b.category, Number(b.monthly_amount)]));

  return (
    <div className="flex flex-col gap-14">
      <SectionHeading
        eyebrow={formatMonth(`${thisMonth}-01`)}
        title="Money"
        action={
          <ButtonLink href="/import" variant="secondary" size="sm">
            Snap a statement
          </ButtonLink>
        }
      />

      {transactions.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing personal tracked yet"
            copy="Snap a screenshot of your banking app and Split Tally will read every line, skip what it already has, and file it by category."
            action={<ButtonLink href="/import">Snap a statement</ButtonLink>}
          />
        </Card>
      ) : (
        <>
          {/* ---- Cash flow ------------------------------------------ */}
          <section className="grid gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <p className="eyebrow text-ink-soft">Money in</p>
              <div className="mt-2">
                <AmountDisplay value={income} currency={currency} size="xl" tone="positive" />
              </div>

              <p className="eyebrow mt-8 text-ink-soft">Money out</p>
              <div className="mt-2">
                <AmountDisplay value={spend} currency={currency} size="xl" tone="negative" />
              </div>

              <p className="mt-8 text-14 text-ink-soft">
                {income > spend
                  ? `You kept ${formatMoney(income - spend, currency)} this month.`
                  : `You spent ${formatMoney(spend - income, currency)} more than came in.`}
              </p>
            </div>

            <div>
              <p className="eyebrow text-ink-soft">Where it went</p>
              <ul className="mt-5 flex flex-col gap-4">
                {categories.map(([category, total]) => (
                  <li key={category}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-14 text-navy">{category}</span>
                      <span className="tabular font-display text-20 text-navy">
                        {formatMoney(total, currency)}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <TallyMarks
                        count={Math.max(1, Math.round((total / (biggest || 1)) * CATEGORY_MARKS))}
                        max={CATEGORY_MARKS}
                        size="sm"
                        tone="soft"
                        animate={false}
                        label={`${category}: ${formatMoney(total, currency)}`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ---- Insights ------------------------------------------- */}
          <Insights
            month={formatMonth(`${thisMonth}-01`)}
            currency={currency}
            income={income}
            spend={spend}
            byCategory={byCategory}
            budgets={budgetMap}
          />

          {/* ---- Budgets -------------------------------------------- */}
          <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
            <div>
              <p className="eyebrow text-ink-soft">Budgets</p>
              {budgets.length === 0 ? (
                <p className="mt-4 text-14 text-ink-soft">
                  No caps set yet. A budget turns into tally marks filling up as the month goes on.
                </p>
              ) : (
                <Card className="mt-4 px-6">
                  <ul>
                    {budgets.map((budget) => (
                      <BudgetRow
                        key={budget.category}
                        category={budget.category}
                        cap={Number(budget.monthly_amount)}
                        spent={byCategory[budget.category] ?? 0}
                        currency={currency}
                      />
                    ))}
                  </ul>
                </Card>
              )}
            </div>

            <Card className="h-fit p-6">
              <p className="eyebrow text-ink-soft">Add a cap</p>
              <div className="mt-5">
                <BudgetForm currency={currency} used={budgets.map((b) => b.category)} />
              </div>
            </Card>
          </section>

          {/* ---- Months --------------------------------------------- */}
          <section>
            <p className="eyebrow text-ink-soft">Month by month</p>
            <Card className="mt-4 px-6">
              <ul>
                {[...months.entries()]
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([month, totals]) => (
                    <li
                      key={month}
                      className="flex items-baseline justify-between gap-4 border-b border-navy/8 py-4 last:border-0"
                    >
                      <span className="text-14 text-navy">{formatMonth(`${month}-01`)}</span>
                      <span className="flex items-baseline gap-6">
                        <span className="flex items-baseline gap-2">
                          <span className="text-12 text-ink-soft">in</span>
                          <AmountDisplay
                            value={totals.in}
                            currency={currency}
                            size="sm"
                            tone="positive"
                          />
                        </span>
                        <span className="flex items-baseline gap-2">
                          <span className="text-12 text-ink-soft">out</span>
                          <AmountDisplay
                            value={totals.out}
                            currency={currency}
                            size="sm"
                            tone="negative"
                          />
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
            </Card>
          </section>

          {/* ---- Recent lines --------------------------------------- */}
          <section>
            <p className="eyebrow text-ink-soft">Recent</p>
            <Card className="mt-4 px-6">
              <ul>
                {transactions.slice(0, 20).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-4 border-b border-navy/8 py-3.5 last:border-0"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 truncate text-14 text-navy">
                        {t.description}
                        {t.source !== "manual" && (
                          <OrbGlyph
                            className="size-3"
                            title={t.source === "voice" ? "Logged by voice" : "Read from a statement"}
                          />
                        )}
                      </span>
                      <span className="block text-12 text-ink-soft">
                        {formatDate(parseDateOnly(t.date))}
                        {t.category ? ` · ${t.category}` : ""}
                      </span>
                    </span>
                    <AmountDisplay
                      value={Number(t.amount)}
                      currency={currency}
                      size="sm"
                      tone={t.direction === "in" ? "positive" : "negative"}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </>
      )}

      {/* ---- Check-in history ------------------------------------- */}
      {checkins.length > 0 && (
        <section>
          <p className="eyebrow text-ink-soft">Weekly tallies</p>
          <Card className="mt-4 px-6">
            <ul>
              {checkins.map((checkin) => (
                <li key={checkin.id} className="border-b border-navy/8 py-5 last:border-0">
                  <p className="font-display text-20 leading-relaxed text-navy">
                    {checkin.summary ?? "Nothing to note that week."}
                  </p>
                  <p className="mt-2 text-12 text-ink-soft">{formatDate(checkin.created_at)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
