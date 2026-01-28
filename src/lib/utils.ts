import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function parseCurrencyToCents(value: string): number {
  if (!value) return 0;
  // Remove R$, spaces, and other non-numeric characters except comma and dot
  const cleanValue = value.replace(/[R$\s]/g, "");
  // Replace comma with dot for parsing
  const normalizedValue = cleanValue.replace(",", ".");
  const numericValue = parseFloat(normalizedValue);
  return isNaN(numericValue) ? 0 : Math.round(numericValue * 100);
}
