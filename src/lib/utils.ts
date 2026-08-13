import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateUniqueSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function absoluteUrl(path: string) {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}
