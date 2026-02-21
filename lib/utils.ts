import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function numberToWords(n: number): string {
  const ones = [
    "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen",
  ];
  const tens = [
    "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
  ];

  if (n === 0) return "zero";
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? "-" + ones[n % 10] : "");
  if (n < 1000) return ones[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + numberToWords(n % 100) : "");
  if (n < 1_000_000) return numberToWords(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + numberToWords(n % 1000) : "");
  return numberToWords(Math.floor(n / 1_000_000)) + " million" + (n % 1_000_000 ? " " + numberToWords(n % 1_000_000) : "");
}

export function getAddendumLabels(addendums: Record<string, boolean>): string[] {
  const map: Record<string, string> = {
    homeInspection: "Home Inspection Contingency",
    financingContingency: "Financing Contingency",
    appraisalContingency: "Appraisal Contingency",
    saleOfBuyersHome: "Sale of Buyer's Current Home Contingency",
    hoaDisclosure: "HOA / Condo Association Disclosure",
    asIs: "As-Is Sale Addendum",
    leadBasedPaint: "Lead-Based Paint Disclosure",
    wellSeptic: "Well & Septic Inspection Addendum",
    radonTesting: "Radon Testing Addendum",
    sellerConcessions: "Seller Concessions / Closing Cost Assistance",
  };
  return Object.entries(addendums)
    .filter(([, v]) => v)
    .map(([k]) => map[k] ?? k);
}
