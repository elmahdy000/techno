"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CatalogFilters } from "@/components/catalog/filters";
import { useT } from "@/i18n/client";
import type { FacetAttribute } from "@/lib/catalog";

export function MobileFilters({
  brands,
  facets,
}: {
  brands: string[];
  facets: FacetAttribute[];
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontal className="h-4 w-4" />
          {t.filters.heading}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.filters.heading}</DialogTitle>
        </DialogHeader>
        <CatalogFilters brands={brands} facets={facets} />
      </DialogContent>
    </Dialog>
  );
}
