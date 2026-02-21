import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn().mockResolvedValue({ id: "resend-id" });

vi.mock("@/lib/pandadoc", () => ({
  createAndSendContract: vi.fn().mockResolvedValue({
    id: "doc-abc",
    brokerLink: "https://pandadoc.com/doc-abc",
    buyerLink: "https://pandadoc.com/doc-abc",
    sellerLink: "https://pandadoc.com/doc-abc",
  }),
}));

vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(() => ({ emails: { send: mockSend } })),
  FROM_EMAIL: "contracts@servicegrid.app",
}));

vi.mock("@react-email/components", () => ({
  render: vi.fn().mockResolvedValue("<html/>"),
}));

vi.mock("@/emails/AgentStatusEmail", () => ({
  default: vi.fn(() => null),
}));

import { POST } from "@/app/api/send-contract/route";
import { createAndSendContract } from "@/lib/pandadoc";
import type { ContractFormData } from "@/types/contract";

const formData: ContractFormData = {
  brokerName: "Carol White",
  brokerEmail: "carol@brokerage.com",
  agentName: "Alex Johnson",
  agentEmail: "alex@realty.com",
  buyerName: "Sam Lee",
  buyerEmail: "sam@email.com",
  sellerName: "Pat Rivera",
  sellerEmail: "pat@email.com",
  propertyAddress: "123 Main St, Springfield, IL 62701",
  offerPrice: 450000,
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

const contractText = "This Purchase Agreement is made between Sam Lee (Buyer) and Pat Rivera (Seller)...";

function makeRequest(fd: ContractFormData, ct: string): Request {
  return new Request("http://localhost/api/send-contract", {
    method: "POST",
    body: JSON.stringify({ formData: fd, contractText: ct }),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/send-contract", () => {
  beforeEach(() => {
    mockSend.mockClear();
    vi.mocked(createAndSendContract).mockClear();
  });

  it("calls createAndSendContract with the formData and contractText from request body", async () => {
    await POST(makeRequest(formData, contractText) as any);
    expect(createAndSendContract).toHaveBeenCalledOnce();
    expect(createAndSendContract).toHaveBeenCalledWith(formData, contractText);
  });

  it("sends exactly one Resend email (agent status ping only)", async () => {
    await POST(makeRequest(formData, contractText) as any);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("agent email goes to agentEmail, not brokerEmail", async () => {
    await POST(makeRequest(formData, contractText) as any);
    const sendCall = mockSend.mock.calls[0][0];
    expect(sendCall.to).toBe(formData.agentEmail);
    expect(sendCall.to).not.toBe(formData.brokerEmail);
  });

  it("email subject contains the propertyAddress", async () => {
    await POST(makeRequest(formData, contractText) as any);
    const sendCall = mockSend.mock.calls[0][0];
    expect(sendCall.subject).toContain(formData.propertyAddress);
  });

  it("returns { success: true, pandaDocId: 'doc-abc' } on success", async () => {
    const response = await POST(makeRequest(formData, contractText) as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, pandaDocId: "doc-abc" });
  });

  it("returns 500 with { error: 'Failed to send contract' } when createAndSendContract throws, and does not call send", async () => {
    vi.mocked(createAndSendContract).mockRejectedValueOnce(new Error("PandaDoc API failure"));

    const response = await POST(makeRequest(formData, contractText) as any);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Failed to send contract" });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 500 when Resend throws", async () => {
    mockSend.mockRejectedValueOnce(new Error("Resend API failure"));

    const response = await POST(makeRequest(formData, contractText) as any);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Failed to send contract" });
  });
});
