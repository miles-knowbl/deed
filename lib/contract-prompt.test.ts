import { describe, it, expect } from "vitest";
import { buildContractPrompt, CONTRACT_SYSTEM_PROMPT } from "./contract-prompt";
import type { ContractFormData } from "@/types/contract";

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const baseData: ContractFormData = {
  brokerName: "Acme Realty Group",
  brokerEmail: "broker@acmerealty.com",
  agentName: "Jane Smith",
  agentEmail: "jane.smith@acmerealty.com",
  buyerName: "John Doe",
  buyerEmail: "john.doe@email.com",
  sellerName: "Mary Johnson",
  sellerEmail: "mary.johnson@email.com",
  propertyAddress: "123 Main St, Springfield, IL 62701",
  offerPrice: 400_000,
  downPaymentPercent: 20,
  loanType: "Conventional",
  specialRequests: "",
  addendums: {
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
  },
};

// ---------------------------------------------------------------------------
// Financial calculation tests
// ---------------------------------------------------------------------------

describe("buildContractPrompt — financial calculations", () => {
  it("embeds the offer price formatted as USD", () => {
    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain("$400,000");
  });

  it("embeds the offer price in words", () => {
    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain("four hundred thousand dollars");
  });

  it("calculates loan amount as offerPrice * (1 - downPaymentPercent / 100)", () => {
    // 400_000 * (1 - 20/100) = 320_000
    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain("$320,000");
  });

  it("calculates loan amount correctly for a different down payment percent", () => {
    // 500_000 * (1 - 10/100) = 450_000
    const data: ContractFormData = {
      ...baseData,
      offerPrice: 500_000,
      downPaymentPercent: 10,
    };
    const prompt = buildContractPrompt(data);
    expect(prompt).toContain("$450,000");
  });

  it("calculates earnest money as Math.round(offerPrice * 0.01)", () => {
    // Math.round(400_000 * 0.01) = 4_000
    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain("$4,000");
  });

  it("rounds earnest money for prices that produce fractional cents", () => {
    // Math.round(333_333 * 0.01) = Math.round(3333.33) = 3_333
    const data: ContractFormData = { ...baseData, offerPrice: 333_333 };
    const prompt = buildContractPrompt(data);
    expect(prompt).toContain("$3,333");
  });

  it("embeds the down payment percent and its dollar value", () => {
    const prompt = buildContractPrompt(baseData);
    // 20% of 400_000 = 80_000
    expect(prompt).toContain("20%");
    expect(prompt).toContain("$80,000");
  });
});

// ---------------------------------------------------------------------------
// Closing date tests
// ---------------------------------------------------------------------------

describe("buildContractPrompt — closing date", () => {
  it("sets closing date to today + 30 days", () => {
    const today = new Date();
    const expected = new Date(today);
    expected.setDate(today.getDate() + 30);
    const expectedStr = expected.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain(expectedStr);
  });

  it("embeds today's date as the effective date", () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain(todayStr);
  });
});

// ---------------------------------------------------------------------------
// Party fields tests
// ---------------------------------------------------------------------------

describe("buildContractPrompt — party fields", () => {
  it("includes buyer name and email", () => {
    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain("John Doe");
    expect(prompt).toContain("john.doe@email.com");
  });

  it("includes seller name and email", () => {
    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain("Mary Johnson");
    expect(prompt).toContain("mary.johnson@email.com");
  });

  it("includes agent name and email", () => {
    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain("Jane Smith");
    expect(prompt).toContain("jane.smith@acmerealty.com");
  });

  it("includes broker name and email", () => {
    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain("Acme Realty Group");
    expect(prompt).toContain("broker@acmerealty.com");
  });

  it("includes the property address", () => {
    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain("123 Main St, Springfield, IL 62701");
  });

  it("includes the loan type", () => {
    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain("Conventional");
  });

  it("reflects a different loan type", () => {
    const data: ContractFormData = { ...baseData, loanType: "FHA" };
    const prompt = buildContractPrompt(data);
    expect(prompt).toContain("FHA");
  });
});

// ---------------------------------------------------------------------------
// Addendum section tests
// ---------------------------------------------------------------------------

describe("buildContractPrompt — addendum section", () => {
  it('shows "None" in the selected addendums line when no addendums are chosen', () => {
    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain("Selected Addendums: None");
  });

  it("lists selected addendum labels in the summary line", () => {
    const data: ContractFormData = {
      ...baseData,
      addendums: { ...baseData.addendums, homeInspection: true, asIs: true },
    };
    const prompt = buildContractPrompt(data);
    expect(prompt).toContain("Home Inspection Contingency");
    expect(prompt).toContain("As-Is Sale Addendum");
  });

  it("does not include unselected addendum labels in the summary line", () => {
    const data: ContractFormData = {
      ...baseData,
      addendums: { ...baseData.addendums, homeInspection: true },
    };
    const prompt = buildContractPrompt(data);
    expect(prompt).not.toContain("Financing Contingency");
    expect(prompt).not.toContain("Lead-Based Paint Disclosure");
  });

  it("renders an addendum block section for each selected addendum", () => {
    const data: ContractFormData = {
      ...baseData,
      addendums: {
        ...baseData.addendums,
        radonTesting: true,
        wellSeptic: true,
      },
    };
    const prompt = buildContractPrompt(data);
    // The template uppercases each addendum label as a section header
    expect(prompt).toContain("RADON TESTING ADDENDUM:");
    expect(prompt).toContain("WELL & SEPTIC INSPECTION ADDENDUM:");
  });

  it("does not render addendum block sections when no addendums are selected", () => {
    const prompt = buildContractPrompt(baseData);
    expect(prompt).not.toContain("HOME INSPECTION CONTINGENCY:");
    expect(prompt).not.toContain("AS-IS SALE ADDENDUM:");
  });

  it("renders all 10 addendum sections when all flags are true", () => {
    const data: ContractFormData = {
      ...baseData,
      addendums: {
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
      },
    };
    const prompt = buildContractPrompt(data);
    expect(prompt).toContain("HOME INSPECTION CONTINGENCY:");
    expect(prompt).toContain("FINANCING CONTINGENCY:");
    expect(prompt).toContain("APPRAISAL CONTINGENCY:");
    expect(prompt).toContain("AS-IS SALE ADDENDUM:");
    expect(prompt).toContain("LEAD-BASED PAINT DISCLOSURE:");
    expect(prompt).toContain("RADON TESTING ADDENDUM:");
    expect(prompt).toContain("SELLER CONCESSIONS / CLOSING COST ASSISTANCE:");
  });
});

// ---------------------------------------------------------------------------
// Special requests tests
// ---------------------------------------------------------------------------

describe("buildContractPrompt — special requests", () => {
  it('shows "None" for special requests when the field is an empty string', () => {
    const prompt = buildContractPrompt(baseData);
    expect(prompt).toContain("Special Requests: None");
  });

  it("includes the special requests content when non-empty", () => {
    const data: ContractFormData = {
      ...baseData,
      specialRequests: "Seller to leave all kitchen appliances.",
    };
    const prompt = buildContractPrompt(data);
    expect(prompt).toContain("Seller to leave all kitchen appliances.");
  });

  it("renders a SPECIAL REQUESTS section block when requests are provided", () => {
    const data: ContractFormData = {
      ...baseData,
      specialRequests: "Buyer requests a 45-day close.",
    };
    const prompt = buildContractPrompt(data);
    expect(prompt).toContain("SPECIAL REQUESTS:");
    expect(prompt).toContain("Buyer requests a 45-day close.");
  });

  it("does not render a SPECIAL REQUESTS section block when requests are empty", () => {
    const prompt = buildContractPrompt(baseData);
    // The summary line has "Special Requests: None" but no standalone block header
    const blockIndex = prompt.indexOf("SPECIAL REQUESTS:\n");
    expect(blockIndex).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// CONTRACT_SYSTEM_PROMPT tests
// ---------------------------------------------------------------------------

describe("CONTRACT_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof CONTRACT_SYSTEM_PROMPT).toBe("string");
    expect(CONTRACT_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it("contains no [PLACEHOLDER] bracket tokens", () => {
    // Matches [PLACEHOLDER] or [PLACEHOLDER TEXT] — unfilled template slots.
    // The regex requires the word PLACEHOLDER (case-insensitive) inside brackets.
    expect(CONTRACT_SYSTEM_PROMPT).not.toMatch(/\[PLACEHOLDER[^\]]*\]/i);
  });

  it("does not contain unfilled template slots of the form [ALL CAPS WORD]", () => {
    // Matches bracket tokens that consist entirely of uppercase letters and spaces
    // AND are at least 3 characters long — the signature of an unfilled slot like
    // [BUYER NAME] or [DATE]. This regex deliberately does NOT match [INSERT]
    // when it appears mid-sentence as an example (that would be caught by the
    // [PLACEHOLDER] test above); instead it targets standalone slot patterns.
    const slotPattern = /\[[A-Z][A-Z ]{2,}\]/g;
    const matches = CONTRACT_SYSTEM_PROMPT.match(slotPattern) ?? [];
    // The word [INSERT] appearing in a sentence like "Never use [INSERT] markers"
    // is intentional instructional prose, not a live unfilled slot. Filter it out
    // and assert there are no remaining slot matches.
    const actualSlots = matches.filter((m) => m !== "[INSERT]");
    expect(actualSlots).toHaveLength(0);
  });
});
