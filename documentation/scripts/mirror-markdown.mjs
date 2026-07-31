/**
 * Mirrors `docs/` into `markdown/` as plain Markdown.
 *
 * The site is for people. This copy is for anybody who would rather point an
 * agent at the repository than click through a sidebar, which for a judge with
 * seven submissions to read is a reasonable preference.
 *
 * The transformation is deliberately small: strip the frontmatter, unwrap the
 * MDX figure divs, turn site-absolute image paths into repository-relative
 * ones, and rewrite internal links so they land on the mirrored file rather
 * than on a route that does not exist on disk.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const DOCS = path.join(ROOT, "docs");
const OUT = path.join(ROOT, "markdown");

function walk(dir, base = "") {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full, path.join(base, entry)));
    else if (/\.mdx?$/.test(entry)) files.push(path.join(base, entry));
  }
  return files;
}

/** How deep this file sits, so image paths can climb back out to the root. */
function upTo(rel) {
  const depth = rel.split(path.sep).length - 1;
  return depth === 0 ? "." : Array(depth).fill("..").join("/");
}

function transform(source, rel) {
  let out = source;

  // Frontmatter carries sidebar ordering, which means nothing in a flat file.
  out = out.replace(/^---\n[\s\S]*?\n---\n+/, "");

  // MDX imports and the figure wrappers are presentation, not content. The
  // caption inside them is content, so only the wrapper goes.
  out = out.replace(/^import\s+.*?;\s*$/gm, "");
  out = out.replace(/^<div className="st-figure">\s*$/gm, "");
  out = out.replace(/^<\/div>\s*$/gm, "");

  // MDX comments would render as literal text in a plain viewer.
  out = out.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  const up = upTo(rel);

  // `/img/...` is a site route. On disk the images live in `static/img`.
  out = out.replace(/\]\(\/img\//g, `](${up}/static/img/`);
  out = out.replace(/src="\/img\//g, `src="${up}/static/img/`);

  // `/docs/a/b` is a route; the mirrored file is `a/b.md` next to this one.
  out = out.replace(/\]\(\/docs\/([a-z0-9\-/]+)\)/g, (_m, target) => `](${up}/${target}.md)`);

  return out.replace(/\n{3,}/g, "\n\n").trimStart();
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const files = walk(DOCS);
for (const rel of files) {
  const target = path.join(OUT, rel.replace(/\.mdx$/, ".md"));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, transform(readFileSync(path.join(DOCS, rel), "utf8"), rel));
}

const index = `# Split Tally documentation, in plain Markdown

This folder is a mirror of [the documentation site](https://zzaved.github.io/Split-Tally/),
generated from the same sources by \`scripts/mirror-markdown.mjs\`. It exists so the whole thing
can be read, searched or fed to an agent without leaving the repository.

The site is the better read: it has the diagrams rendered and the navigation. This is the same
words.

${files
  .map((rel) => `- [${rel.replace(/\.mdx?$/, "")}](./${rel.replace(/\.mdx$/, ".md")})`)
  .sort()
  .join("\n")}
`;

writeFileSync(path.join(OUT, "README.md"), index);
console.log(`mirrored ${files.length} documents into markdown/`);
