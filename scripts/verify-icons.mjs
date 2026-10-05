// Verifies the generated icons actually contain the glyph.
//
// We cannot look at the PNGs, so assert on pixel statistics instead:
//   1. corners are brand teal (background, and rounded only where expected)
//   2. white pixels exist and are a small minority (a glyph, not a fill)
//   3. the white pixels form one connected blob in the centre (a bubble),
//      rather than the wide multi-line band that mistyped SVG produces
//   4. white extent sits inside the maskable safe zone
//
// Run: node scripts/verify-icons.mjs

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const BRAND = { r: 0x10, g: 0xb8, b: 0xa2 };

const targets = [
  { file: "public/icon-192.png", size: 192, rounded: true, maxExtent: 0.75 },
  { file: "public/icon-512.png", size: 512, rounded: true, maxExtent: 0.75 },
  { file: "public/icon-maskable-512.png", size: 512, rounded: false, maxExtent: 0.55 },
  { file: "public/apple-touch-icon.png", size: 180, rounded: false, maxExtent: 0.68 },
];

let failed = false;

function fail(file, msg) {
  failed = true;
  console.log(`  FAIL ${file}: ${msg}`);
}

for (const { file, size, rounded, maxExtent } of targets) {
  console.log(`\n${file} (${size}x${size})`);
  const path = fileURLToPath(new URL(`../${file}`, import.meta.url));
  const { data } = await sharp(await readFile(path))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = (x, y) => {
    const i = (y * size + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
  };
  const near = (c, t, tol = 26) =>
    Math.abs(c.r - t.r) <= tol && Math.abs(c.g - t.g) <= tol && Math.abs(c.b - t.b) <= tol;

  const opaque = px(Math.floor(size / 2), Math.floor(size / 2)).a === 255;
  if (!opaque) fail(file, "centre is not fully opaque");
  else console.log("  centre opaque: ok");

  const isBrand = (c) => near(c, BRAND);
  if (rounded) {
    // A rounded rect: corner pixels are cut away, edge midpoints are solid.
    if (px(0, 0).a !== 0 || px(size - 1, size - 1).a !== 0) {
      fail(file, "rounded icon: corner pixel is opaque, radius not applied");
    } else {
      console.log("  corners transparent: ok");
    }
    const mid = Math.floor(size / 2);
    const edges = [px(mid, 1), px(mid, size - 2), px(1, mid), px(size - 2, mid)];
    if (!edges.every(isBrand)) {
      fail(file, "rounded icon: edge midpoints are not brand — shape is malformed");
    } else {
      console.log("  edge midpoints solid brand: ok");
    }
    // Every transparent pixel must sit in a corner region. A hole in the
    // middle would mean the background failed to paint the shape.
    let stray = 0;
    const r = Math.round(size * 0.25); // generous bound on the radius
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (px(x, y).a !== 255) {
          const inCorner = (x < r || x >= size - r) && (y < r || y >= size - r);
          if (!inCorner) stray++;
        }
      }
    }
    if (stray > 0) fail(file, `${stray} transparent pixels outside the corner regions — shape has holes`);
    else console.log("  no stray transparency: ok");
  } else {
    const corners = [px(0, 0), px(size - 1, 0), px(0, size - 1), px(size - 1, size - 1)];
    const brandCorners = corners.filter(isBrand).length;
    if (brandCorners < 4) fail(file, `square icon: only ${brandCorners}/4 corners brand — corners must be solid`);
    else console.log("  corners solid brand: ok");
  }

  // The string-child bug renders the SVG markup as *black* text. Reject any
  // dark ink outright — the glyph must be the only non-background colour.
  let dark = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = px(x, y);
      if (c.a > 200 && c.r < 90 && c.g < 90 && c.b < 90) dark++;
    }
  }
  if (dark > 0) fail(file, `${dark} dark pixels — SVG was typeset as text instead of drawn`);
  else console.log("  no dark ink: ok");

  // Collect near-white pixels.
  const white = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = px(x, y);
      if (c.a > 200 && c.r > 225 && c.g > 225 && c.b > 225) white.push([x, y]);
    }
  }

  const ratio = white.length / (size * size);
  console.log(`  white pixels: ${white.length} (${(ratio * 100).toFixed(2)}%)`);
  if (white.length < 200) fail(file, "too few white pixels — glyph did not render");
  if (ratio > 0.35) fail(file, "too many white pixels — looks like a fill, not a glyph");

  if (!white.length) continue;

  const xs = white.map((p) => p[0]);
  const ys = white.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = maxX - minX + 1, hgt = maxY - minY + 1;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;

  console.log(
    `  white bbox: ${w}x${hgt} at (${minX},${minY}) centre (${cx.toFixed(0)},${cy.toFixed(0)})`,
  );

  const aspect = w / hgt;
  if (aspect < 0.7 || aspect > 1.45) {
    fail(file, `bbox aspect ${aspect.toFixed(2)} — a mistyped-SVG text band is very wide; expected a near-square bubble`);
  } else {
    console.log(`  bbox aspect ${aspect.toFixed(2)}: ok`);
  }

  // Centred within 6% of the canvas.
  if (Math.abs(cx - size / 2) > size * 0.06 || Math.abs(cy - size / 2) > size * 0.06) {
    fail(file, `glyph off-centre by (${(cx - size / 2).toFixed(0)},${(cy - size / 2).toFixed(0)})`);
  } else {
    console.log("  centred: ok");
  }

  // Single connected blob: rows with white must form one contiguous run of
  // bands. Text produces several separated lines.
  const rowsWithWhite = new Set(ys);
  let bands = 0, inBand = false;
  for (let y = 0; y < size; y++) {
    const has = rowsWithWhite.has(y);
    if (has && !inBand) { bands++; inBand = true; }
    else if (!has) inBand = false;
  }
  if (bands > 2) fail(file, `${bands} separate white bands — that is text, not a single glyph`);
  else console.log(`  white bands: ${bands}: ok`);

  const extent = Math.max(w, hgt) / size;
  if (extent > maxExtent) fail(file, `glyph spans ${(extent * 100).toFixed(0)}% of canvas, limit ${(maxExtent * 100).toFixed(0)}%`);
  else console.log(`  extent ${(extent * 100).toFixed(0)}% <= ${(maxExtent * 100).toFixed(0)}%: ok`);
}

console.log(failed ? "\nRESULT: FAILED" : "\nRESULT: all icon checks passed");
process.exit(failed ? 1 : 0);