// One-off generator for the PWA icon set in public/.
// Run: node scripts/generate-icons.mjs
//
// Produces the raster icons a web app manifest needs (Chromium will not
// offer installation without a 192px and a 512px PNG):
//   public/icon-192.png           any-purpose, browser install prompt
//   public/icon-512.png           any-purpose, splash screens
//   public/icon-maskable-512.png  Android adaptive icon (safe zone padding)
//   public/apple-touch-icon.png   iOS home screen
//
// src/app/icon.tsx keeps generating the 32px favicon at build time; this
// script only covers the sizes a manifest has to name explicitly.

import { writeFile } from "node:fs/promises";
import { ImageResponse } from "next/og.js";

const BRAND = "#10b8a2"; // primary — matches src/app/icon.tsx

// The chat-bubble glyph from the same source file, drawn as raw SVG so it
// scales cleanly from 180px to 512px without a font dependency.
const GLYPH = `<svg width="62%" height="62%" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

function icon({ size, radius }) {
  return new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND,
          borderRadius: radius,
        },
        children: GLYPH,
      },
    },
    { width: size, height: size },
  );
}

const targets = [
  { file: "public/icon-192.png", size: 192, radius: 40 },
  { file: "public/icon-512.png", size: 512, radius: 108 },
  // Maskable icons get cropped to a circle on some launchers, so the
  // corners stay square and the glyph stays inside the 80% safe zone.
  { file: "public/icon-maskable-512.png", size: 512, radius: 0 },
  // iOS masks apple-touch-icon to a rounded square itself and never reads
  // the manifest, so the glyph keeps extra padding to avoid clipping.
  { file: "public/apple-touch-icon.png", size: 180, radius: 0 },
];

for (const { file, size, radius } of targets) {
  const res = await icon({ size, radius });
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(new URL(`../${file}`, import.meta.url), buf);
  console.log(`${file} — ${size}x${size}, ${buf.length} bytes`);
}