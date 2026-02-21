import { describe, it, expect } from "vitest";
import { formatUSD, numberToWords, getAddendumLabels } from "./utils";

describe("formatUSD", () => {
  it("formats whole dollar amounts", () => {
    expect(formatUSD(450000)).toBe("$450,000");
    expect(formatUSD(0)).toBe("$0");
    expect(formatUSD(1000000)).toBe("$1,000,000");
  });

  it("handles large amounts with multiple comma groups", () => {
    expect(formatUSD(1_200_000)).toBe("$1,200,000");
  });
});

describe("numberToWords", () => {
  it("converts small numbers", () => {
    expect(numberToWords(0)).toBe("zero");
    expect(numberToWords(1)).toBe("one");
    expect(numberToWords(15)).toBe("fifteen");
  });

  it("converts tens", () => {
    expect(numberToWords(20)).toBe("twenty");
    expect(numberToWords(42)).toBe("forty-two");
  });

  it("converts hundreds", () => {
    expect(numberToWords(100)).toBe("one hundred");
    expect(numberToWords(450)).toBe("four hundred fifty");
  });

  it("converts thousands", () => {
    expect(numberToWords(450000)).toBe("four hundred fifty thousand");
    expect(numberToWords(1000)).toBe("one thousand");
  });

  it("converts millions", () => {
    expect(numberToWords(1_200_000)).toBe("one million two hundred thousand");
  });

  it("converts millions with thousands and hundreds remainder", () => {
    expect(numberToWords(450_500)).toBe("four hundred fifty thousand five hundred");
  });
});

describe("getAddendumLabels", () => {
  it("returns labels for selected addendums", () => {
    const result = getAddendumLabels({
      homeInspection: true,
      financingContingency: false,
      appraisalContingency: true,
      saleOfBuyersHome: false,
      hoaDisclosure: false,
      asIs: false,
      leadBasedPaint: false,
      wellSeptic: false,
      radonTesting: false,
      sellerConcessions: false,
    });
    expect(result).toEqual([
      "Home Inspection Contingency",
      "Appraisal Contingency",
    ]);
  });

  it("returns empty array when none selected", () => {
    const result = getAddendumLabels({
      homeInspection: false,
      financingContingency: false,
      appraisalContingency: false,
      saleOfBuyersHome: false,
      hoaDisclosure: false,
      asIs: false,
      leadBasedPaint: false,
      wellSeptic: false,
      radonTesting: false,
      sellerConcessions: false,
    });
    expect(result).toEqual([]);
  });

  it("returns all 10 labels when all flags are true", () => {
    const result = getAddendumLabels({
      homeInspection: true,
      financingContingency: true,
      appraisalContingency: true,
      saleOfBuyersHome: true,
      hoaDisclosure: true,
      asIs: true,
      leadBasedPaint: true,
      wellSeptic: true,
      radonTesting: true,
      sellerConcessions: true,
    });
    expect(result).toHaveLength(10);
    expect(result).toContain("Home Inspection Contingency");
    expect(result).toContain("Financing Contingency");
    expect(result).toContain("Appraisal Contingency");
    expect(result).toContain("Sale of Buyer's Current Home Contingency");
    expect(result).toContain("HOA / Condo Association Disclosure");
    expect(result).toContain("As-Is Sale Addendum");
    expect(result).toContain("Lead-Based Paint Disclosure");
    expect(result).toContain("Well & Septic Inspection Addendum");
    expect(result).toContain("Radon Testing Addendum");
    expect(result).toContain("Seller Concessions / Closing Cost Assistance");
  });

  it("falls back to the raw key for unknown addendum keys", () => {
    const result = getAddendumLabels({
      unknownAddendum: true,
      homeInspection: false,
    } as Record<string, boolean>);
    expect(result).toEqual(["unknownAddendum"]);
  });
});
