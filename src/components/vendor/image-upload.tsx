"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ImageUpload({
  images,
  onChange,
}: {
  images: string[];
  onChange: (urls: string[]) => void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [urlInput, setUrlInput] = useState("");

  function upload(file: File) {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) {
          toast.error(json.error ?? t.common.error);
          return;
        }
        if (images.length >= 8) {
          toast.error(t.common.error);
          return;
        }
        onChange([...images, json.url]);
      } catch {
        toast.error(t.common.error);
      }
    });
  }

  function addUrl() {
    const v = urlInput.trim();
    if (!v) return;
    onChange([...images, v]);
    setUrlInput("");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={`${url}-${i}`} className="group relative h-24 w-24 overflow-hidden rounded-md border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={t.common.delete}
            >
              <Trash2 className="h-4 w-4 text-white" />
            </button>
            {i === 0 && (
              <span className="absolute bottom-0 left-0 right-0 bg-primary/90 px-1 text-center text-[9px] font-semibold text-primary-foreground">
                {t.vendor.images}
              </span>
            )}
          </div>
        ))}
        {images.length < 8 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className={cn(
              "flex h-24 w-24 items-center justify-center rounded-md border border-dashed text-muted-foreground hover:border-primary hover:text-primary",
              pending && "opacity-50",
            )}
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      <div className="flex max-w-md gap-2">
        <Input
          dir="ltr"
          placeholder="https://..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addUrl}>
          {t.common.add}
        </Button>
      </div>
    </div>
  );
}
