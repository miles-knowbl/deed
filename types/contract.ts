export type LoanType = "Conventional" | "FHA" | "VA" | "Cash" | "USDA";

export interface ContractFormData {
  // Broker
  brokerName: string;
  brokerEmail: string;

  // Selling agent (app user)
  agentName: string;
  agentEmail: string;

  // Buying client
  buyerName: string;
  buyerEmail: string;

  // Seller / seller's agent
  sellerName: string;
  sellerEmail: string;

  // Property
  propertyAddress: string;

  // Offer
  offerPrice: number;
  downPaymentPercent: number;
  loanType: LoanType;

  // Special requests
  specialRequests: string;

  // Addendums
  addendums: {
    homeInspection: boolean;
    financingContingency: boolean;
    appraisalContingency: boolean;
    saleOfBuyersHome: boolean;
    hoaDisclosure: boolean;
    asIs: boolean;
    leadBasedPaint: boolean;
    wellSeptic: boolean;
    radonTesting: boolean;
    sellerConcessions: boolean;
  };
}

export interface ContractState {
  formData: ContractFormData | null;
  contractText: string;
  pandaDocId: string | null;
  setFormData: (data: ContractFormData) => void;
  appendContractText: (chunk: string) => void;
  setContractText: (text: string) => void;
  setPandaDocId: (id: string) => void;
  reset: () => void;
}
