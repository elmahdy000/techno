"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { getErrorMessage } from "@/i18n/errors";
import { deleteProduct } from "@/lib/actions/vendor-actions";
import { Button } from "@/components/ui/button";

export function DeleteProductButton({
  productId,
  label,
}: {
  productId: string;
  label: string;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t.common.delete + "?")) return;
        startTransition(async () => {
          try {
            await deleteProduct(locale, productId);
            toast.success(t.vendor.productDeleted);
            router.refresh();
          } catch (err) {
            toast.error(getErrorMessage(err, t));
          }
        });
      }}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
