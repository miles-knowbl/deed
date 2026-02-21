import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVerifySignature, mockSend } = vi.hoisted(() => ({
  mockVerifySignature: vi.fn(() => true),
  mockSend: vi.fn().mockResolvedValue({ id: "email-id" }),
}));

vi.mock("@/lib/pandadoc", () => ({
  verifyWebhookSignature: mockVerifySignature,
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

vi.mock("@/emails/FullyExecutedEmail", () => ({
  default: vi.fn(() => null),
}));

import { POST } from "@/app/api/webhook/pandadoc/route";
import AgentStatusEmail from "@/emails/AgentStatusEmail";
import FullyExecutedEmail from "@/emails/FullyExecutedEmail";

const baseMetadata = {
  agentEmail: "alex@realty.com",
  agentName: "Alex Johnson",
  offerPrice: "450000",
  loanType: "Conventional",
  downPaymentPercent: "20",
};

const makeRecipient = (order: number, completed: boolean) => ({
  id: `r${order}`,
  email: `r${order}@test.com`,
  first_name: order === 1 ? "Jane" : order === 2 ? "Sam" : "Morgan",
  last_name: "Smith",
  role: order === 1 ? "Broker" : order === 2 ? "Buyer" : "Seller",
  has_completed: completed,
  signing_order: order,
});

function makeRequest(events: unknown[], rawBody?: string): Request {
  const body = rawBody ?? JSON.stringify(events);
  return new Request("http://localhost/api/webhook/pandadoc", {
    method: "POST",
    body,
    headers: {
      "x-pandadoc-signature": "test-sig",
      "Content-Type": "application/json",
    },
  });
}

function makeEvent(
  recipients: ReturnType<typeof makeRecipient>[],
  metadata: Record<string, string> = baseMetadata,
  docName = "Purchase Agreement — 123 Main St, Springfield, IL 62701"
) {
  return {
    event: "recipient_completed",
    data: {
      id: "doc-123",
      name: docName,
      status: "document.waiting_approval",
      metadata,
      recipients,
    },
  };
}

describe("POST /api/webhook/pandadoc", () => {
  beforeEach(() => {
    mockVerifySignature.mockClear();
    mockVerifySignature.mockReturnValue(true);
    mockSend.mockClear();
    mockSend.mockResolvedValue({ id: "email-id" });
    vi.mocked(AgentStatusEmail).mockClear();
    vi.mocked(FullyExecutedEmail).mockClear();
  });

  // ─── Authentication ────────────────────────────────────────────────────────

  describe("Authentication", () => {
    it("returns 401 when verifyWebhookSignature returns false", async () => {
      mockVerifySignature.mockReturnValueOnce(false);
      const response = await POST(makeRequest([]) as any);
      expect(response.status).toBe(401);
      const text = await response.text();
      expect(text).toBe("Unauthorized");
    });

    it("returns 200 and never calls send when signature is valid but events array is empty", async () => {
      const response = await POST(makeRequest([]) as any);
      expect(response.status).toBe(200);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("passes raw body string (not parsed JSON) to verifyWebhookSignature", async () => {
      const events = [makeEvent([makeRecipient(1, true), makeRecipient(2, false), makeRecipient(3, false)])];
      const rawBody = JSON.stringify(events);
      await POST(makeRequest(events, rawBody) as any);
      expect(mockVerifySignature).toHaveBeenCalledOnce();
      const firstArg = mockVerifySignature.mock.calls[0][0];
      expect(typeof firstArg).toBe("string");
      expect(firstArg).toBe(rawBody);
    });
  });

  // ─── Event routing ─────────────────────────────────────────────────────────

  describe("Event routing", () => {
    it("ignores events where event !== recipient_completed — send never called", async () => {
      const event = {
        event: "document_state_changed",
        data: {
          id: "doc-123",
          name: "Purchase Agreement — 123 Main St",
          status: "document.sent",
          metadata: baseMetadata,
          recipients: [makeRecipient(1, true)],
        },
      };
      const response = await POST(makeRequest([event]) as any);
      expect(response.status).toBe(200);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("ignores when recipients is empty — send never called", async () => {
      const event = {
        event: "recipient_completed",
        data: {
          id: "doc-123",
          name: "Purchase Agreement — 123 Main St",
          status: "document.waiting_approval",
          metadata: baseMetadata,
          recipients: [],
        },
      };
      const response = await POST(makeRequest([event]) as any);
      expect(response.status).toBe(200);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("ignores when no has_completed=true recipients — send never called", async () => {
      const recipients = [
        makeRecipient(1, false),
        makeRecipient(2, false),
        makeRecipient(3, false),
      ];
      const response = await POST(makeRequest([makeEvent(recipients)]) as any);
      expect(response.status).toBe(200);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  // ─── Broker signed (signing_order=1) ───────────────────────────────────────

  describe("Broker signed (signing_order=1)", () => {
    it("sends one AgentStatusEmail to agentEmail when broker (order 1) signs", async () => {
      const recipients = [
        makeRecipient(1, true),
        makeRecipient(2, false),
        makeRecipient(3, false),
      ];
      const response = await POST(makeRequest([makeEvent(recipients)]) as any);
      expect(response.status).toBe(200);
      expect(mockSend).toHaveBeenCalledTimes(1);
      const sendCall = mockSend.mock.calls[0][0];
      expect(sendCall.to).toBe("alex@realty.com");
      expect(sendCall.subject).toContain("Broker Signed");
    });

    it("nextStepMessage names the buyer", async () => {
      const recipients = [
        makeRecipient(1, true),
        makeRecipient(2, false),
        makeRecipient(3, false),
      ];
      await POST(makeRequest([makeEvent(recipients)]) as any);
      const agentEmailCalls = vi.mocked(AgentStatusEmail).mock.calls;
      expect(agentEmailCalls.length).toBeGreaterThanOrEqual(1);
      const props = agentEmailCalls[agentEmailCalls.length - 1][0] as Record<string, unknown>;
      expect(String(props.nextStepMessage)).toContain("Sam");
    });

    it("does NOT call send when agentEmail is empty", async () => {
      const recipients = [
        makeRecipient(1, true),
        makeRecipient(2, false),
        makeRecipient(3, false),
      ];
      const metadata = { ...baseMetadata, agentEmail: "" };
      const response = await POST(makeRequest([makeEvent(recipients, metadata)]) as any);
      expect(response.status).toBe(200);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  // ─── Buyer signed (signing_order=2) ───────────────────────────────────────

  describe("Buyer signed (signing_order=2)", () => {
    it("sends one AgentStatusEmail to agentEmail when buyer (order 2) signs", async () => {
      const recipients = [
        makeRecipient(1, true),
        makeRecipient(2, true),
        makeRecipient(3, false),
      ];
      const response = await POST(makeRequest([makeEvent(recipients)]) as any);
      expect(response.status).toBe(200);
      expect(mockSend).toHaveBeenCalledTimes(1);
      const sendCall = mockSend.mock.calls[0][0];
      expect(sendCall.to).toBe("alex@realty.com");
      expect(sendCall.subject).toContain("Buyer Signed");
    });

    it("does not double-send when broker is also completed — only 1 email sent to agent", async () => {
      const recipients = [
        makeRecipient(1, true),
        makeRecipient(2, true),
        makeRecipient(3, false),
      ];
      const response = await POST(makeRequest([makeEvent(recipients)]) as any);
      expect(response.status).toBe(200);
      // justSigned is buyer (highest completed order=2); broker's prior completion is ignored
      expect(mockSend).toHaveBeenCalledTimes(1);
      const sendCall = mockSend.mock.calls[0][0];
      expect(sendCall.to).toBe("alex@realty.com");
    });
  });

  // ─── All signed (fully executed) ───────────────────────────────────────────

  describe("All signed (fully executed)", () => {
    it("sends 4 emails when all parties have signed", async () => {
      const recipients = [
        makeRecipient(1, true),
        makeRecipient(2, true),
        makeRecipient(3, true),
      ];
      const response = await POST(makeRequest([makeEvent(recipients)]) as any);
      expect(response.status).toBe(200);
      expect(mockSend).toHaveBeenCalledTimes(4);
    });

    it("first 3 emails go to each recipient's email, 4th goes to agentEmail", async () => {
      const recipients = [
        makeRecipient(1, true),
        makeRecipient(2, true),
        makeRecipient(3, true),
      ];
      await POST(makeRequest([makeEvent(recipients)]) as any);
      const calls = mockSend.mock.calls.map((c) => c[0]);
      const partyEmails = calls.slice(0, 3).map((c) => c.to);
      expect(partyEmails).toContain("r1@test.com");
      expect(partyEmails).toContain("r2@test.com");
      expect(partyEmails).toContain("r3@test.com");
      expect(calls[3].to).toBe("alex@realty.com");
    });

    it("FullyExecutedEmail sent to each of the 3 signing parties", async () => {
      const recipients = [
        makeRecipient(1, true),
        makeRecipient(2, true),
        makeRecipient(3, true),
      ];
      await POST(makeRequest([makeEvent(recipients)]) as any);
      expect(vi.mocked(FullyExecutedEmail).mock.calls.length).toBe(3);
    });

    it("AgentStatusEmail sent as 4th email to agentEmail with subject containing Fully Executed", async () => {
      const recipients = [
        makeRecipient(1, true),
        makeRecipient(2, true),
        makeRecipient(3, true),
      ];
      await POST(makeRequest([makeEvent(recipients)]) as any);
      const lastCall = mockSend.mock.calls[3][0];
      expect(lastCall.to).toBe("alex@realty.com");
      expect(lastCall.subject).toContain("Fully Executed");
    });

    it("skips party with undefined/missing email — only 3 emails when broker has no email", async () => {
      const recipients = [
        // broker without email field
        {
          id: "r1",
          first_name: "Jane",
          last_name: "Smith",
          role: "Broker",
          has_completed: true,
          signing_order: 1,
        },
        makeRecipient(2, true),
        makeRecipient(3, true),
      ];
      const event = {
        event: "recipient_completed",
        data: {
          id: "doc-123",
          name: "Purchase Agreement — 123 Main St, Springfield, IL 62701",
          status: "document.waiting_approval",
          metadata: baseMetadata,
          recipients,
        },
      };
      await POST(makeRequest([event]) as any);
      // broker skipped (no email), buyer + seller + agent = 3
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it("offerPrice is parsed as Number from string metadata — FullyExecutedEmail called with offerPrice: 450000 (number)", async () => {
      const recipients = [
        makeRecipient(1, true),
        makeRecipient(2, true),
        makeRecipient(3, true),
      ];
      await POST(makeRequest([makeEvent(recipients)]) as any);
      const fullyExecutedCalls = vi.mocked(FullyExecutedEmail).mock.calls;
      expect(fullyExecutedCalls.length).toBeGreaterThan(0);
      const props = fullyExecutedCalls[0][0] as Record<string, unknown>;
      expect(props.offerPrice).toBe(450000);
      expect(typeof props.offerPrice).toBe("number");
    });

    it("propertyAddress is derived from data.name by stripping 'Purchase Agreement — ' prefix", async () => {
      const recipients = [
        makeRecipient(1, true),
        makeRecipient(2, true),
        makeRecipient(3, true),
      ];
      const docName = "Purchase Agreement — 456 Elm Ave, Chicago, IL 60601";
      await POST(makeRequest([makeEvent(recipients, baseMetadata, docName)]) as any);
      const fullyExecutedCalls = vi.mocked(FullyExecutedEmail).mock.calls;
      const props = fullyExecutedCalls[0][0] as Record<string, unknown>;
      expect(props.propertyAddress).toBe("456 Elm Ave, Chicago, IL 60601");
    });
  });

  // ─── Multiple events ────────────────────────────────────────────────────────

  describe("Multiple events", () => {
    it("processes all events in array — two broker-signed events results in send called twice", async () => {
      const recipients = [
        makeRecipient(1, true),
        makeRecipient(2, false),
        makeRecipient(3, false),
      ];
      const event = makeEvent(recipients);
      const response = await POST(makeRequest([event, event]) as any);
      expect(response.status).toBe(200);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it("returns 500 when send throws", async () => {
      mockSend.mockRejectedValueOnce(new Error("Resend network error"));
      const recipients = [
        makeRecipient(1, true),
        makeRecipient(2, false),
        makeRecipient(3, false),
      ];
      const response = await POST(makeRequest([makeEvent(recipients)]) as any);
      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe("Internal Server Error");
    });
  });
});
