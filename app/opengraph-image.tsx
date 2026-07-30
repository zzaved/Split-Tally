import { ImageResponse } from "next/og";

export const alt = "Split Tally: finance without forms";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Cream, cobalt strokes, the tally jelly and the wordmark (BUILD.MD §10).
 * Rendered at build time, so the Cormorant fetch happens once and never on a
 * user's request. If the font cannot be fetched the card still renders in a
 * serif fallback rather than failing the build.
 */
async function cormorant(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&display=swap",
      { headers: { "User-Agent": "Mozilla/5.0" } },
    ).then((r) => r.text());

    const url = css.match(/src:\s*url\((https:[^)]+\.(?:ttf|otf|woff))\)/)?.[1];
    if (!url) return null;

    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const font = await cormorant();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F4F0E5",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* The sweeping arc, bleeding off the top-right corner. */}
        <svg
          width="620"
          height="620"
          viewBox="0 0 300 300"
          fill="none"
          style={{ position: "absolute", top: -150, right: -140 }}
        >
          <path d="M288 10C188 22 88 92 28 242" stroke="#2547C9" strokeWidth="8" strokeOpacity="0.4" strokeLinecap="round" />
          <path d="M296 22C198 34 98 102 40 254" stroke="#2547C9" strokeWidth="4.5" strokeOpacity="0.24" strokeLinecap="round" />
        </svg>

        {/* The wave along the bottom. */}
        <svg
          width="1100"
          height="200"
          viewBox="0 0 500 90"
          fill="none"
          style={{ position: "absolute", bottom: -46, left: -60 }}
        >
          <path d="M6 40C80 8 150 66 230 42C310 18 380 74 494 40" stroke="#2547C9" strokeWidth="7" strokeOpacity="0.26" strokeLinecap="round" />
          <path d="M6 54C82 24 152 80 232 56C312 32 382 86 494 54" stroke="#2547C9" strokeWidth="4" strokeOpacity="0.16" strokeLinecap="round" />
        </svg>

        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="46" height="55" viewBox="0 0 200 240" fill="none">
            <g stroke="#2547C9" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
              <path d="M28 104C24 46 74 16 100 16C126 16 176 46 172 104" />
              <path d="M28 104C48 118 60 92 82 106C104 120 116 92 138 106C158 118 166 96 172 104" />
              <path d="M58 110C50 140 64 168 54 206" strokeWidth="10" />
              <path d="M79 113C71 145 85 173 75 211" strokeWidth="10" />
              <path d="M100 114C92 147 106 175 96 214" strokeWidth="10" />
              <path d="M121 113C113 145 127 173 117 210" strokeWidth="10" />
              <path d="M44 200C73 181 104 158 137 127" strokeWidth="10" />
            </g>
          </svg>
          <div
            style={{
              fontFamily: font ? "Cormorant" : "serif",
              fontSize: 40,
              color: "#1B2B6B",
              letterSpacing: "0.01em",
            }}
          >
            Split Tally
          </div>
        </div>

        {/* The thesis */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 900 }}>
          <div
            style={{
              fontFamily: font ? "Cormorant" : "serif",
              fontSize: 108,
              lineHeight: 1.02,
              color: "#1B2B6B",
            }}
          >
            Finance without forms.
          </div>
          <div style={{ fontSize: 30, color: "#5A679E", lineHeight: 1.45, maxWidth: 760 }}>
            Say what you spent. Split Tally writes the ledger, and lets you sell what you are owed.
          </div>
        </div>

        {/* Tally marks, as a signature along the baseline */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 22 }}>
          {[0, 1, 2].map((g) => (
            <svg key={g} width="52" height="44" viewBox="0 0 28 24" fill="none">
              <g stroke="#2547C9" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.85">
                <path d="M3 3C2 9 4 15 3 21" />
                <path d="M9 3C10 9 8 15 9.5 21" />
                <path d="M15 3C14 9 16 15 15 21" />
                <path d="M21 3C22 9 20 15 21 21" />
                <path d="M1.5 20.5C8 17 18 10 26.5 4" />
              </g>
            </svg>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Cormorant", data: font, style: "normal" as const, weight: 600 as const }]
        : [],
    },
  );
}
