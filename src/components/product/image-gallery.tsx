"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ImageGallery({
  images,
  name,
}: {
  images: Array<{ url: string; alt: string | null }>;
  name: string;
}) {
  const [index, setIndex] = useState(0);
  const main = images[index] ?? images[0];

  if (!main) return null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={main.url}
          alt={main.alt ?? name}
          className="h-full w-full object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted",
                i === index && "border-primary ring-1 ring-primary",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt ?? name} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
