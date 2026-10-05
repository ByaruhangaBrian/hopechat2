// Generator for the PWA icon set in public/.
// Run: node scripts/generate-icons.mjs
//
// Produces the raster icons a web app manifest needs (Chromium will not
// offer installation without a 192px and a 512px PNG):
//   public/icon-192.png           any-purpose, browser install prompt
//   public/icon-512.png           any-purpose, splash screens
//   public/icon-maskable-512.png  Android adaptive icon
//   public/apple-touch-icon.png   iOS home screen
//
// src/app/icon.tsx keeps generating the 32px favicon at build time; this
// script only covers the sizes a manifest has to name explicitly.
//
// GOTCHA worth keeping: ImageResponse (satori) renders SVG only when the
// <svg> exists as real element nodes in the tree. Handing it an SVG *string*
// as a child does not parse the markup — it typesets it as literal text.
// That bug shipped once already, hence the element-based glyph below.

import { writeFile } from "node:fs/promises";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";

const BRAND = "#10b8a2"; // primary — matches src/app/icon.tsx

// The chat-bubble glyph from src/app/icon.tsx, as element nodes. `scale` is
// a fraction of the canvas: 1.0 would touch the edges.
function glyph(size, scale) {
  const dim = Math.round(size * scale);
  return h(
    "svg",
    {
      width: dim,
      height: dim,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "#ffffff",
      strokeWidth: 2.2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    },
    h("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }),
  );
}

function icon({ size, radius, scale }) {
  return new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND,
          borderRadius: radius,
        },
      },
      glyph(size, scale),
    ),
    { width: size, height: size },
  );
}

const targets = [
  // Rounded corners: these are shown as-is by the install dialog.
  { file: "public/icon-192.png", size: 192, radius: 40, scale: 0.62 },
  { file: "public/icon-512.png", size: 512, radius: 108, scale: 0.62 },
  // Maskable: launchers crop to a circle/squircle, so corners stay square
  // and the glyph stays well inside the 80% safe zone.
  { file: "public/icon-maskable-512.png", size: 512, radius: 0, scale: 0.46 },
  // iOS masks apple-touch-icon to a rounded square itself and never reads
  // the manifest, so it must ship square-cornered and pre-padded.
  { file: "public/apple-touch-icon.png", size: 180, radius: 0, scale: 0.56 },
];

for (const { file, size, radius, scale } of targets) {
  const res = await icon({ size, radius, scale });
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(new URL(`../${file}`, import.meta.url), buf);
  console.log(`${file} — ${size}x${size}, ${buf.length} bytes`);
}