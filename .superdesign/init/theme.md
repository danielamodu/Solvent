# Theme files and tokens

The app uses Tailwind utilities and has no external component library or CSS-variable theme.

## `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  padding: 0;
  margin: 0;
}
```

## `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

Color usage: `neutral-950` page background, `neutral-900` card surfaces, `neutral-800/700` borders and input surfaces, `neutral-100/300/400/500` text. Amber indicates upcoming liquidity or caution, red overdue/failure, emerald healthy/confirmed. System sans typography, 30px semibold page heading, compact supporting text, rounded-lg/xl panels, thin borders, Tailwind responsive `sm` breakpoints.
