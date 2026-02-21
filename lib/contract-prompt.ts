import type { ContractFormData } from "@/types/contract";
import { formatUSD, numberToWords, getAddendumLabels } from "@/lib/utils";

export function buildContractPrompt(data: ContractFormData): string {
  const selectedAddendums = getAddendumLabels(data.addendums as unknown as Record<string, boolean>);
  const loanAmount = data.offerPrice * (1 - data.downPaymentPercent / 100);
  const earnestMoney = Math.round(data.offerPrice * 0.01);
  const today = new Date();
  const closingDate = new Date(today);
  closingDate.setDate(today.getDate() + 30);
  const closingDateStr = closingDate.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
  const todayStr = today.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return `You are drafting a formal Residential Purchase Agreement. Write the complete, professional contract below. Use formal legal language throughout. Fill in every blank with the provided information. Do not use placeholder brackets — every field should contain real data from the inputs provided.

CONTRACT DATA:
- Effective Date: ${todayStr}
- Property Address: ${data.propertyAddress}
- Buyer: ${data.buyerName} (${data.buyerEmail})
- Seller / Seller's Agent: ${data.sellerName} (${data.sellerEmail})
- Selling Agent (Buyer's Agent): ${data.agentName} (${data.agentEmail})
- Broker: ${data.brokerName} (${data.brokerEmail})
- Offer Price: ${formatUSD(data.offerPrice)} (${numberToWords(data.offerPrice)} dollars)
- Down Payment: ${data.downPaymentPercent}% (${formatUSD(data.offerPrice * data.downPaymentPercent / 100)})
- Loan Amount: ${formatUSD(loanAmount)}
- Loan Type: ${data.loanType}
- Earnest Money Deposit: ${formatUSD(earnestMoney)}
- Proposed Closing Date: ${closingDateStr}
- Selected Addendums: ${selectedAddendums.length > 0 ? selectedAddendums.join(", ") : "None"}
- Special Requests: ${data.specialRequests || "None"}

Write the full contract with these exact sections in order. Use clear section headers in ALL CAPS followed by a colon.

RESIDENTIAL PURCHASE AGREEMENT

PARTIES:
[Full parties section — buyer, seller, agents, broker with all contact info]

PROPERTY:
[Property description section]

PURCHASE PRICE AND TERMS:
[Price, earnest money, financing details]

FINANCING:
[Loan type, down payment, financing contingency if selected]

CLOSING:
[Closing date, possession, closing costs]

CONDITION OF PROPERTY:
[Seller representations, as-is language if selected]

INCLUSIONS AND EXCLUSIONS:
[Standard fixtures and appliances language]

TITLE:
[Title commitment, title insurance, transfer]

DEFAULT AND REMEDIES:
[Earnest money forfeiture, specific performance rights]

${selectedAddendums.length > 0 ? selectedAddendums.map(a => `${a.toUpperCase()}:\n[Full addendum text for ${a}]`).join("\n\n") : ""}

${data.specialRequests ? `SPECIAL REQUESTS:\n${data.specialRequests}` : ""}

ENTIRE AGREEMENT:
[Integration clause]

GOVERNING LAW:
[Governing law clause]

COUNTERPARTS AND ELECTRONIC SIGNATURES:
[Electronic signature acceptance clause]

SIGNATURES:
[Signature blocks for Broker, Buyer, and Seller/Seller's Agent with name, title, date lines]

Write the complete contract now. Be thorough and professional. Each section should contain complete, legally sound language appropriate for a residential real estate purchase agreement.`;
}

export const CONTRACT_SYSTEM_PROMPT = `You are an expert real estate attorney drafting a Residential Purchase Agreement. Write complete, professional, legally sound contract language. Use formal language throughout. Never use placeholder brackets or [INSERT] markers — use the actual data provided. Write every section in full.`;
