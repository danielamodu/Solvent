// Solvent brand mark — hook + stem + bowl line mark, drawn in currentColor
// with a non-scaling stroke so the hairline weight survives at icon sizes.
// To swap in final artwork, replace the paths below or point to /logo.svg.
export function SolventMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 480"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      role="img"
      aria-label="Solvent logo"
    >
      {/* vector-effect lives on each shape: it is not an inherited property,
          so putting it on <svg> silently disables it and the mark vanishes. */}
      <path d="M225 60 H55 V225 C55 285 115 328 178 330" vectorEffect="non-scaling-stroke" />
      <path d="M155 190 V430" vectorEffect="non-scaling-stroke" />
      <path d="M155 190 C250 190 375 235 375 310 C375 375 325 425 272 432" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
