import type { Dictionary } from "@/i18n/dictionaries/en";

/**
 * Maps an error thrown by a Server Action to a localized message.
 *
 * Server actions throw compact error codes (e.g. "notEnoughStock") that are
 * looked up in the active dictionary. Dynamic errors use a `code:value`
 * prefix format (e.g. "skuTaken:SKU-123") so the payload can be interpolated
 * into the localized template.
 */
export function getErrorMessage(err: unknown, t: Dictionary): string {
  if (typeof err === "string") {
    return lookup(err, t);
  }
  if (!(err instanceof Error)) return t.errors.default;
  return lookup(err.message, t);
}

function lookup(message: string, t: Dictionary): string {

  // Dynamic errors carrying an interpolated value.
  const dynamicPrefixes: Record<string, (value: string) => string> = {
    skuTaken: (sku) => t.errors.skuTaken.replace("{sku}", sku),
    stockChanged: (product) => t.errors.stockChanged.replace("{product}", product),
  };
  for (const [prefix, format] of Object.entries(dynamicPrefixes)) {
    if (message.startsWith(`${prefix}:`)) {
      return format(message.slice(prefix.length + 1));
    }
  }

  // Known static error codes map straight to the dictionary.
  if (message in t.errors) {
    return (t.errors as Record<string, string>)[message];
  }

  return t.errors.default;
}
