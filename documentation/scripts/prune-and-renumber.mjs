/**
 * Removes figures that cannot be produced honestly, then renumbers the three
 * sequences so they run continuously in reading order.
 *
 * Ten images were asked for that nobody can capture truthfully: screenshots of
 * external dashboards belonging to somebody's private accounts, a photograph,
 * and four bug states that no longer exist because the bugs were fixed. The
 * honest options were to fabricate them or to drop them. This drops them, and
 * then closes the holes left in the numbering rather than leaving the site
 * jumping from Figure 12 to Figure 15.
 *
 * Run from `documentation/`: node scripts/prune-and-renumber.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const DOCS = path.join(ROOT, "docs");

/** Reading order, which is the sidebar order. Numbering follows it. */
const ORDER = [
  "intro.md",
  "problem-and-solution.md",
  "judging-alignment.md",
  "how-it-works/architecture.md",
  "how-it-works/ai-integration.md",
  "how-it-works/the-ledger.md",
  "using-it/user-flows.md",
  "using-it/setup-and-deployment.md",
  "project/agents.mdx",
  "project/design-system.md",
  "project/quality.md",
  "project/roadmap.md",
  "project/team.md",
];

/**
 * The images nobody can produce truthfully, named explicitly rather than
 * inferred from what happens to be on disk. Inferring would silently drop
 * every figure whose capture had not finished yet, which is how a
 * documentation site quietly loses half its illustrations.
 */
const IMPOSSIBLE = new Set([
  // Screenshots of private dashboards belonging to somebody's own accounts.
  "/img/screens/supabase-tables.png",
  "/img/screens/elevenlabs-tools.png",
  "/img/screens/vercel-env.png",
  "/img/screens/github-pages-deploy.png",
  "/img/screens/repo-contributors.png",
  // A photograph.
  "/img/team/pablo.png",
  // Bug states that no longer exist, because the bugs were fixed. Staging a
  // fake one to illustrate a real finding would undo the point of the finding.
  "/img/screens/qa-signout-desync.png",
  "/img/screens/qa-duplicate-listings.png",
  "/img/screens/qa-expense-form-crash.png",
  "/img/screens/qa-exchange-overflow-375.png",
]);

function droppable(src) {
  return IMPOSSIBLE.has(src);
}

const KINDS = ["Figure", "Flowchart", "Table"];

// ---------------------------------------------------------------------------
// Pass one: drop the figure blocks whose image will never exist.
// ---------------------------------------------------------------------------

const dropped = [];

function prune(text, file) {
  const lines = text.split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim() !== '<div className="st-figure">') {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    // Collect the block up to its closing div.
    let j = i;
    let depth = 0;
    while (j < lines.length) {
      if (lines[j].includes('<div className="st-figure">')) depth += 1;
      if (lines[j].trim() === "</div>") {
        depth -= 1;
        if (depth === 0) break;
      }
      j += 1;
    }

    const block = lines.slice(i, j + 1);
    const image = block.join("\n").match(/\]\((\/img\/[^)]+)\)/);

    if (image && droppable(image[1])) {
      const caption = block.join("\n").match(/\*\*((?:Figure|Flowchart|Table) \d+):/);
      dropped.push({ file, image: image[1], label: caption?.[1] ?? "unlabelled" });
      // Drop the block and the blank line that follows it.
      i = j + 1;
      while (i < lines.length && lines[i].trim() === "") i += 1;
      continue;
    }

    out.push(...block);
    i = j + 1;
  }

  return out.join("\n");
}

const files = ORDER.filter((rel) => existsSync(path.join(DOCS, rel)));
const bodies = new Map();

for (const rel of files) {
  bodies.set(rel, prune(readFileSync(path.join(DOCS, rel), "utf8"), rel));
}

// ---------------------------------------------------------------------------
// Pass two: renumber. Captions are walked in reading order and assigned the
// next number of their kind; every in-prose reference is then remapped through
// the same table.
// ---------------------------------------------------------------------------

const maps = Object.fromEntries(KINDS.map((k) => [k, new Map()]));
const next = Object.fromEntries(KINDS.map((k) => [k, 1]));

for (const rel of files) {
  const body = bodies.get(rel);
  for (const match of body.matchAll(/\*\*(Figure|Flowchart|Table) (\d+):/g)) {
    const [, kind, oldNumber] = match;
    const key = Number(oldNumber);
    if (!maps[kind].has(key)) maps[kind].set(key, next[kind]++);
  }
}

for (const rel of files) {
  let body = bodies.get(rel);
  // Two phases through a sentinel, because renaming in place lets a number that
  // has already moved be moved again: 5 becomes 3, and then the rule for 3
  // catches it a second time.
  for (const kind of KINDS) {
    body = body.replace(new RegExp(`\\b${kind} (\\d+)\\b`, "g"), (whole, n) => {
      const to = maps[kind].get(Number(n));
      return to ? `\x01${kind}\x01${to}\x01` : whole;
    });
  }
  body = body.replace(/\x01([A-Za-z]+)\x01(\d+)\x01/g, "$1 $2");
  writeFileSync(path.join(DOCS, rel), body);
}

console.log(`dropped ${dropped.length} figures that could not be produced:`);
for (const d of dropped) console.log(`  ${d.label.padEnd(12)} ${d.image}  (${d.file})`);
console.log("\nsequences now run:");
for (const kind of KINDS) console.log(`  ${kind}: 1 to ${next[kind] - 1}`);
