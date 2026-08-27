// ponytail: one SVG mark (the splash chain-lock) rasterized to every icon size we need.
// No image reads, no per-size hand-authoring — sharp scales the same vector.
// Mark geometry mirrors components/ChainLockSplash.tsx at its rest (locked) pose:
// two interlocking rounded-rect chain links (±15 offset, rx13, stroke 6.5) + a
// click ring (r40, stroke 2), all #111 on white. Mark bbox = 80×80 (the ring).
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const OUT = 'assets/images';
const STROKE = '#111111';

// Mark = two interlocking chain links only. (Click ring removed per request.)
// Mark bbox = 78×40 (the links); centered on canvas.
const markAt = (scale, canvas = 1024) => {
  const o = canvas / 2;
  const s = scale;
  // chain link: rounded rect w48 h40 rx13, stroke 6.5, no fill, centered at (o+cx*s, o).
  const link = (cx) =>
    `<rect x="${o + (cx - 24) * s}" y="${o - 20 * s}" width="${48 * s}" height="${40 * s}" rx="${13 * s}" fill="none" stroke="${STROKE}" stroke-width="${6.5 * s}"/>`;
  return `${link(-15)}${link(15)}`;
};

const svg = (scale, canvas = 1024) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}"><rect width="${canvas}" height="${canvas}" fill="#ffffff"/>${markAt(scale, canvas)}</svg>`;

// icon.png + splash-icon.png: mark fills ~640px (scale 8). adaptive-icon.png:
// mark ~560px (scale 7) to stay inside the adaptive-icon 66% safe zone.
const renders = {
  'icon.png': svg(8),
  'splash-icon.png': svg(8),
  'adaptive-icon.png': svg(7),
};

for (const [name, body] of Object.entries(renders)) {
  await sharp(Buffer.from(body)).png().toFile(`${OUT}/${name}`);
  console.log('wrote', name);
}
// favicon: render the icon-scale mark then downscale to 48 (chain stroke ~3px, visible).
await sharp(Buffer.from(svg(8))).resize(48, 48).png().toFile(`${OUT}/favicon.png`);
console.log('wrote favicon.png');