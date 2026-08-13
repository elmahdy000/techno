"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { useLocale } from "@/i18n/client";
import { link } from "@/lib/links";

export function SearchBar() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(
      `${link(locale, "/catalog")}?q=${encodeURIComponent(query)}`,
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.nav.searchPlaceholder}
          className="ps-9"
        />
      </div>
      <Button type="submit" size="sm" className="shrink-0">
        {t.nav.search}
      </Button>
    </form>
  );
}
