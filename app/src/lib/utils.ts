import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function trimLeadingZeros(val: string | null | undefined): string {
  if (!val) return "";
  return val.replace(/^0+/, "") || "0";
}
