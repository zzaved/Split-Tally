"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ink/Button";
import { Card } from "@/components/ink/Card";
import { FormMessage } from "@/components/ink/Field";
import { OrbGlyph } from "@/components/ink/Orb";
import { TallyLoader } from "@/components/ink/TallyMarks";
import { createClient } from "@/lib/supabase/client";
import { currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markDuplicates, saveStatementRows, type ReviewRow } from "./actions";

type Stage = "pick" | "reading" | "review" | "done";

const LOADER_LINES = [
  "Reading your statement…",
  "Counting the strokes…",
  "Matching what you already have…",
];

/** Longest edge, before upload. Anything bigger is wasted on the model. */
const MAX_EDGE = 1600;

/**
 * Snap → read → review → save (BUILD.MD §5.6). The compression happens in the
 * browser so a 12 megapixel photo never crosses the wire.
 */
export function ImportFlow({ userId, currency }: { userId: string; currency: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("pick");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const symbol = currencySymbol(currency);

  async function compress(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("compression failed"))),
        "image/jpeg",
        0.85,
      );
    });
  }

  async function handleFile(file: File) {
    setError(null);
    setStage("reading");

    try {
      const blob = await compress(file);
      const path = `${userId}/${Date.now()}-statement.jpg`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("statements")
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });

      if (uploadError) {
        setError("That image could not be uploaded. Try a smaller screenshot.");
        setStage("pick");
        return;
      }

      setStoragePath(path);

      const response = await fetch("/api/parse-statement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path }),
      });

      const data = (await response.json()) as { transactions?: ReviewRow[]; error?: string };

      if (!response.ok || !data.transactions) {
        setError(data.error ?? "Couldn't read this one, try a clearer screenshot.");
        setStage("pick");
        return;
      }

      if (data.transactions.length === 0) {
        setError("No transactions were visible in that image. Try a clearer screenshot.");
        setStage("pick");
        return;
      }

      const reviewed = await markDuplicates(data.transactions);
      setRows(reviewed);
      // Duplicates start unchecked; everything else is ready to save.
      setSelected(new Set(reviewed.map((r, i) => (r.duplicate ? -1 : i)).filter((i) => i >= 0)));
      setStage("review");
    } catch {
      setError("Something went wrong reading that. Try again.");
      setStage("pick");
    }
  }

  async function save() {
    setSaving(true);
    setError(null);

    const chosen = rows.filter((_, i) => selected.has(i));
    const response = await saveStatementRows({
      rows: chosen,
      storagePath: storagePath ?? undefined,
    });

    setSaving(false);

    if (response.error) {
      setError(response.error);
      return;
    }

    setResult(response.ok ?? "Saved.");
    setStage("done");
    router.refresh();
  }

  if (stage === "reading") {
    return (
      <Card className="py-20">
        <TallyLoader lines={LOADER_LINES} size="lg" />
      </Card>
    );
  }

  if (stage === "done") {
    return (
      <Card className="p-8 text-center">
        <p className="font-display text-28 text-navy">{result}</p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/money">See your money</ButtonLink>
          <Button
            variant="secondary"
            onClick={() => {
              setStage("pick");
              setRows([]);
              setResult(null);
              setStoragePath(null);
            }}
          >
            Snap another
          </Button>
        </div>
      </Card>
    );
  }

  if (stage === "review") {
    const duplicates = rows.filter((r) => r.duplicate).length;

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="flex items-center gap-2 text-14 text-ink-soft">
            <OrbGlyph className="size-3" title="Read by AI" />
            {rows.length} lines read
            {duplicates > 0 && ` · ${duplicates} already tallied`}
          </p>
          <button
            type="button"
            onClick={() =>
              setSelected(
                selected.size === rows.length ? new Set() : new Set(rows.map((_, i) => i)),
              )
            }
            className="eyebrow text-cobalt underline-offset-4 hover:underline"
          >
            {selected.size === rows.length ? "Select none" : "Select all"}
          </button>
        </div>

        <Card className="overflow-x-auto px-4 sm:px-6">
          <ul className="min-w-[520px]">
            {rows.map((row, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-center gap-3 border-b border-navy/8 py-3 last:border-0",
                  row.duplicate && "opacity-70",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    })
                  }
                  className="size-4 shrink-0 accent-[var(--color-cobalt)]"
                  aria-label={`Include ${row.description}`}
                />

                <input
                  type="date"
                  value={row.date}
                  onChange={(e) =>
                    setRows((current) =>
                      current.map((r, j) => (j === i ? { ...r, date: e.target.value } : r)),
                    )
                  }
                  className="w-32 shrink-0 rounded-well border border-navy/12 bg-cream px-2 py-1 text-12 focus:border-cobalt focus:outline-none"
                  aria-label="Date"
                />

                <input
                  value={row.description}
                  onChange={(e) =>
                    setRows((current) =>
                      current.map((r, j) => (j === i ? { ...r, description: e.target.value } : r)),
                    )
                  }
                  className="min-w-0 flex-1 rounded-well border border-navy/12 bg-cream px-2 py-1 text-14 focus:border-cobalt focus:outline-none"
                  aria-label="Description"
                />

                {row.duplicate && (
                  <span className="eyebrow shrink-0 rounded-full border border-navy/15 px-2 py-0.5 text-ink-soft">
                    Already tallied
                  </span>
                )}

                <select
                  value={row.direction}
                  onChange={(e) =>
                    setRows((current) =>
                      current.map((r, j) =>
                        j === i ? { ...r, direction: e.target.value as "in" | "out" } : r,
                      ),
                    )
                  }
                  className="shrink-0 rounded-well border border-navy/12 bg-cream px-2 py-1 text-12 focus:border-cobalt focus:outline-none"
                  aria-label="Direction"
                >
                  <option value="out">out</option>
                  <option value="in">in</option>
                </select>

                <span className="flex shrink-0 items-center gap-1">
                  <span className="text-14 text-ink-soft">{symbol}</span>
                  <input
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(e) =>
                      setRows((current) =>
                        current.map((r, j) =>
                          j === i ? { ...r, amount: Number(e.target.value) || 0 } : r,
                        ),
                      )
                    }
                    className="tabular w-20 rounded-well border border-navy/12 bg-cream px-2 py-1 text-right text-14 focus:border-cobalt focus:outline-none"
                    aria-label="Amount"
                  />
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {error && <FormMessage>{error}</FormMessage>}

        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={save} disabled={saving || selected.size === 0}>
            {saving ? "Saving…" : `Add ${selected.size} selected`}
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setStage("pick")}>
            Start over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card
        className="flex flex-col items-center gap-5 border-dashed px-6 py-16 text-center"
        as="section"
      >
        <p className="font-display text-28 text-navy">Drop a screenshot of your statement</p>
        <p className="max-w-sm text-14 text-ink-soft">
          Anything your banking app can show: a list of transactions is all it needs. The image
          goes to a private bucket and is read once.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        <Button size="lg" onClick={() => inputRef.current?.click()}>
          Choose an image
        </Button>
      </Card>

      {error && <FormMessage>{error}</FormMessage>}
    </div>
  );
}
