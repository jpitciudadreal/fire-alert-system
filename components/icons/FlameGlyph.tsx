interface FlameGlyphProps {
  className?: string;
  title?: string;
}

/**
 * Single source of truth for the flame mark used across the app
 * (home header, auth panel and any future placement). Sizing and colour
 * are controlled externally via `className`.
 */
export function FlameGlyph({ className, title }: FlameGlyphProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d="M13.5 2c.4 3.4-2.4 4.6-2.7 7.7-.2 1.7.7 3.3 2.2 4 .3.1.6-.2.4-.5-.3-.7-.3-1.5.1-2.2.4-.7 1.2-1.2 2-1.4.6-.1 1.1.6.9 1.2-.3.9-.2 1.7.2 2.4 1.3 2.4.7 5.4-1.4 7-1.4 1.1-3.3 1.4-4.9.7-2-.9-3.1-3-2.6-5.3.3-1.4 1.2-2.6 2.4-3.4.4-.3 0-.9-.5-.7-2.8.7-4.6 3.6-4.3 6.4.3 2.5 2.1 4.6 4.5 5.4 3 .9 6.3-.5 7.7-3.3 1.4-2.7.5-6-2-7.7 1 .7 2 1.7 2.5 3 .4.9.6 1.9.4 2.8-.1.5.6.8.9.4 1.6-1.8 1.8-4.6.5-6.7C16.5 6.9 13.6 4 12 2c.5.6 1 1.3 1.5 2z" />
    </svg>
  );
}
