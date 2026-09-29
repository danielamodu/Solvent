# Solvent design system (extracted from the current frontend)

The existing app is a compact treasury dashboard. Preserve current structure and styling when wiring screens; do not redesign from scratch.

- Framework: Next.js 14 App Router, React 18, TypeScript.
- Styling: Tailwind CSS; custom utility components in `app/components/ui.tsx`; no component library.
- Page canvas: `neutral-950`, white/neutral text; content width max 3xl; generous page-level vertical gap.
- Surface: `neutral-900` cards with `neutral-800` border, rounded-xl and p-4/p-5.
- Inputs and secondary buttons: `neutral-800` fields, `neutral-700` borders.
- Typography: system sans via Tailwind defaults, semibold hierarchy, compact supporting text.
- Status: amber for upcoming/shortfall, red for overdue/errors, emerald for healthy/confirmed.
- Responsive layout: Tailwind `sm` grids; dashboard action cards pair in two columns on wider screens.
- Interaction patterns: pending/busy button labels, Skeleton reads, TxFeedback transaction receipt state, Arbiscan links.

Raw CSS and Tailwind configuration are preserved in `.superdesign/init/theme.md`.
