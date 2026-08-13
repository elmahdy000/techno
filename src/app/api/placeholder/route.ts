import { NextResponse } from "next/server";

const PALETTES: Array<[string, string]> = [
  ["#7c3aed", "#4f46e5"],
  ["#2563eb", "#0ea5e9"],
  ["#0891b2", "#14b8a6"],
  ["#9333ea", "#db2777"],
  ["#dc2626", "#f97316"],
  ["#059669", "#84cc16"],
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const text = url.searchParams.get("t") ?? "Product";
  const w = Math.min(Math.max(Number(url.searchParams.get("w")) || 600, 120), 1024);
  const h = Math.min(Math.max(Number(url.searchParams.get("h")) || 600, 120), 1024);

  const palette = PALETTES[
    Math.abs(hash(text)) % PALETTES.length
  ] as [string, string];

  const label = sanitize(text).slice(0, 40);
  const sub = "TechnoMarket";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette[0]}"/>
      <stop offset="100%" stop-color="${palette[1]}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <g fill="#ffffff" opacity="0.12">
    <circle cx="${w * 0.85}" cy="${h * 0.15}" r="${w * 0.3}"/>
    <circle cx="${w * 0.1}" cy="${h * 0.9}" r="${w * 0.4}"/>
  </g>
  <text x="${w / 2}" y="${h / 2 - 6}" font-family="system-ui, sans-serif" font-size="${Math.round(w / 14)}" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text>
  <text x="${w / 2}" y="${h / 2 + Math.round(w / 14) + 10}" font-family="system-ui, sans-serif" font-size="${Math.round(w / 26)}" fill="#ffffff" opacity="0.8" text-anchor="middle">${sub}</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return h;
}

function sanitize(input: string): string {
  return input
    .replace(/[<>&"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
