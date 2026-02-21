import { describe, it, expect } from "vitest";
import { formatUSD, numberToWords, getAddendumLabels } from "./utils";

describe("formatUSD", () => {
  it("formats whole dollar amounts", () => {
    expect(formatUSD(450000)).toBe("$450,000");
    expect(formatUSD(0)).toBe("$0");
    expect(formatUSD(1000000)).toBe("$1,000,000");
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
});
