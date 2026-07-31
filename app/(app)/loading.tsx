/**
 * Shown while a page in the shell is being built.
 *
 * There was nothing here at all, so a slow route left the previous page
 * frozen on screen with the tab spinner as the only clue: the press appeared
 * to have done nothing, and pressing again was the natural response.
 *
 * Deliberately not a skeleton of the page to come. Guessing at a layout that
 * then rearranges is its own small dishonesty, and this is meant to be read
 * for a moment, not studied.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6 pt-4" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>

      <div className="h-3 w-24 rounded-full bg-navy/8 motion-safe:animate-pulse" />
      <div className="h-9 w-64 max-w-full rounded-full bg-navy/8 motion-safe:animate-pulse" />

      <div className="mt-2 flex flex-col gap-3">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="h-20 rounded-card bg-navy/5 motion-safe:animate-pulse"
            style={{ animationDelay: `${row * 120}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
