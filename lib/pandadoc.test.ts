import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { verifyWebhookSignature, createAndSendContract } from "@/lib/pandadoc";

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------

const formData = {
  brokerName: "Jane Smith",
  brokerEmail: "jane@broker.com",
  agentName: "Alex Johnson",
  agentEmail: "alex@realty.com",
  buyerName: "Sam Lee",
  buyerEmail: "sam@email.com",
  sellerName: "Morgan Davis",
  sellerEmail: "morgan@email.com",
  propertyAddress: "123 Main St, Austin, TX 78701",
  offerPrice: 450000,
  downPaymentPercent: 20,
  loanType: "Conventional" as const,
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

const CONTRACT_TEXT = "This is a test contract.";

// ---------------------------------------------------------------------------
// Helper — build a standard happy-path mock fetch
// ---------------------------------------------------------------------------

function makeMockFetch() {
  return vi
    .fn()
    // Call 1: POST /documents
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "doc-abc" }),
      text: async () => "",
    })
    // Call 2: GET /documents/doc-abc (poll) — returns draft
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: "document.draft" }),
      text: async () => "",
    })
    // Call 3: POST /documents/doc-abc/send
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => "",
    });
}

// ---------------------------------------------------------------------------
// verifyWebhookSignature
// ---------------------------------------------------------------------------

describe("verifyWebhookSignature", () => {
  const secret = "my-webhook-secret";
  const payload = "test-payload-body";

  beforeEach(() => {
    process.env.PANDADOC_WEBHOOK_SECRET = secret;
  });

  afterEach(() => {
    delete process.env.PANDADOC_WEBHOOK_SECRET;
  });

  it("returns false when PANDADOC_WEBHOOK_SECRET is not set", () => {
    delete process.env.PANDADOC_WEBHOOK_SECRET;
    const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    expect(verifyWebhookSignature(payload, sig)).toBe(false);
  });

  it("returns true for a valid HMAC-SHA256 signature", () => {
    const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    expect(verifyWebhookSignature(payload, sig)).toBe(true);
  });

  it("returns false for a wrong signature", () => {
    const wrongSig = crypto
      .createHmac("sha256", "different-secret")
      .update(payload)
      .digest("hex");
    expect(verifyWebhookSignature(payload, wrongSig)).toBe(false);
  });

  it("returns false for a malformed non-hex signature (catch branch)", () => {
    expect(verifyWebhookSignature(payload, "not-valid-hex!!!")).toBe(false);
  });

  it("is case-insensitive — uppercase hex signature still passes", () => {
    const sig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")
      .toUpperCase();
    expect(verifyWebhookSignature(payload, sig)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createAndSendContract
// ---------------------------------------------------------------------------

describe("createAndSendContract", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.PANDADOC_API_KEY = "test-key";
    mockFetch = makeMockFetch();
    vi.stubGlobal("fetch", mockFetch);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete process.env.PANDADOC_API_KEY;
  });

  // -------------------------------------------------------------------------
  // Happy path — shape of result
  // -------------------------------------------------------------------------

  it("returns { id, brokerLink, buyerLink, sellerLink } on happy path", async () => {
    const promise = createAndSendContract(formData, CONTRACT_TEXT);
    await vi.advanceTimersByTimeAsync(7000);
    const result = await promise;

    expect(result.id).toBe("doc-abc");
    expect(result.brokerLink).toContain("doc-abc");
    expect(result.buyerLink).toContain("doc-abc");
    expect(result.sellerLink).toContain("doc-abc");
  });

  // -------------------------------------------------------------------------
  // First fetch call — method and URL
  // -------------------------------------------------------------------------

  it("first fetch call POSTs to a URL ending in /documents", async () => {
    const promise = createAndSendContract(formData, CONTRACT_TEXT);
    await vi.advanceTimersByTimeAsync(7000);
    await promise;

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toMatch(/\/documents$/);
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
  });

  // -------------------------------------------------------------------------
  // FormData "data" field — document metadata
  // -------------------------------------------------------------------------

  it("the FormData 'data' field contains correct JSON (name, recipients, metadata)", async () => {
    const promise = createAndSendContract(formData, CONTRACT_TEXT);
    await vi.advanceTimersByTimeAsync(7000);
    await promise;

    const body = mockFetch.mock.calls[0][1].body as FormData;
    const dataStr = body.get("data") as string;
    const data = JSON.parse(dataStr);

    expect(data.name).toBe(`Purchase Agreement — ${formData.propertyAddress}`);
    expect(Array.isArray(data.recipients)).toBe(true);
    expect(data.recipients).toHaveLength(3);
    expect(data.metadata.propertyAddress).toBe(formData.propertyAddress);
    expect(data.metadata.agentEmail).toBe(formData.agentEmail);
    expect(data.metadata.agentName).toBe(formData.agentName);
    expect(data.metadata.offerPrice).toBe(String(formData.offerPrice));
    expect(data.metadata.loanType).toBe(formData.loanType);
    expect(data.metadata.downPaymentPercent).toBe(String(formData.downPaymentPercent));
  });

  // -------------------------------------------------------------------------
  // Signing order values
  // -------------------------------------------------------------------------

  it("recipient signing_order values are 1, 2, 3 for broker, buyer, seller", async () => {
    const promise = createAndSendContract(formData, CONTRACT_TEXT);
    await vi.advanceTimersByTimeAsync(7000);
    await promise;

    const body = mockFetch.mock.calls[0][1].body as FormData;
    const data = JSON.parse(body.get("data") as string);

    const broker = data.recipients.find((r: { role: string }) => r.role === "Broker");
    const buyer = data.recipients.find((r: { role: string }) => r.role === "Buyer");
    const seller = data.recipients.find((r: { role: string }) => r.role === "Seller");

    expect(broker.signing_order).toBe(1);
    expect(buyer.signing_order).toBe(2);
    expect(seller.signing_order).toBe(3);
  });

  // -------------------------------------------------------------------------
  // Name splitting — multi-word
  // -------------------------------------------------------------------------

  it("multi-word name: buyerName 'Mary Jo Smith' → first_name 'Mary', last_name 'Jo Smith'", async () => {
    const customForm = { ...formData, buyerName: "Mary Jo Smith" };
    const promise = createAndSendContract(customForm, CONTRACT_TEXT);
    await vi.advanceTimersByTimeAsync(7000);
    await promise;

    const body = mockFetch.mock.calls[0][1].body as FormData;
    const data = JSON.parse(body.get("data") as string);
    const buyer = data.recipients.find((r: { role: string }) => r.role === "Buyer");

    expect(buyer.first_name).toBe("Mary");
    expect(buyer.last_name).toBe("Jo Smith");
  });

  // -------------------------------------------------------------------------
  // Name splitting — single word
  // -------------------------------------------------------------------------

  it("single-word name: brokerName 'Madonna' → first_name 'Madonna', last_name ''", async () => {
    const customForm = { ...formData, brokerName: "Madonna" };
    const promise = createAndSendContract(customForm, CONTRACT_TEXT);
    await vi.advanceTimersByTimeAsync(7000);
    await promise;

    const body = mockFetch.mock.calls[0][1].body as FormData;
    const data = JSON.parse(body.get("data") as string);
    const broker = data.recipients.find((r: { role: string }) => r.role === "Broker");

    expect(broker.first_name).toBe("Madonna");
    expect(broker.last_name).toBe("");
  });

  // -------------------------------------------------------------------------
  // Polling — 2 cycles before draft
  // -------------------------------------------------------------------------

  it("polls until document.draft — first poll returns 'document.uploaded', second returns 'document.draft', fetch called 4 times total", async () => {
    const twoPolls = vi
      .fn()
      // Call 1: POST /documents
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "doc-abc" }),
        text: async () => "",
      })
      // Call 2: GET /documents/doc-abc — intermediate state
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "document.uploaded" }),
        text: async () => "",
      })
      // Call 3: GET /documents/doc-abc — draft
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "document.draft" }),
        text: async () => "",
      })
      // Call 4: POST /documents/doc-abc/send
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => "",
      });

    vi.stubGlobal("fetch", twoPolls);

    const promise = createAndSendContract(formData, CONTRACT_TEXT);
    // First poll interval (6 000 ms)
    await vi.advanceTimersByTimeAsync(7000);
    // Second poll interval (6 000 ms)
    await vi.advanceTimersByTimeAsync(7000);
    await promise;

    expect(twoPolls).toHaveBeenCalledTimes(4);
  });

  // -------------------------------------------------------------------------
  // Error: create fails
  // -------------------------------------------------------------------------

  it("throws 'PandaDoc create failed: 422' when first fetch returns 422", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({}),
        text: async () => "Validation error",
      })
    );

    await expect(createAndSendContract(formData, CONTRACT_TEXT)).rejects.toThrow(
      "PandaDoc create failed: 422"
    );
  });

  // -------------------------------------------------------------------------
  // Error: document.error during poll
  // -------------------------------------------------------------------------

  it("throws 'PandaDoc document processing failed' when poll returns status 'document.error'", async () => {
    const errorFetch = vi
      .fn()
      // Call 1: POST /documents
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "doc-abc" }),
        text: async () => "",
      })
      // Call 2: GET /documents/doc-abc — error state
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "document.error" }),
        text: async () => "",
      });

    vi.stubGlobal("fetch", errorFetch);

    // Attach rejection handler before advancing timers so the promise is
    // never "unhandled" at the process level.
    const promise = createAndSendContract(formData, CONTRACT_TEXT);
    const caught = promise.catch((e: Error) => e);

    await vi.advanceTimersByTimeAsync(7000);

    const err = await caught;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe("PandaDoc document processing failed");
  });

  // -------------------------------------------------------------------------
  // Error: send fails
  // -------------------------------------------------------------------------

  it("throws 'PandaDoc send failed: 503' when send call returns 503", async () => {
    const sendFailFetch = vi
      .fn()
      // Call 1: POST /documents
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "doc-abc" }),
        text: async () => "",
      })
      // Call 2: GET /documents/doc-abc — draft
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: "document.draft" }),
        text: async () => "",
      })
      // Call 3: POST /documents/doc-abc/send — 503
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
        text: async () => "Service unavailable",
      });

    vi.stubGlobal("fetch", sendFailFetch);

    const promise = createAndSendContract(formData, CONTRACT_TEXT);
    const caught = promise.catch((e: Error) => e);

    await vi.advanceTimersByTimeAsync(7000);

    const err = await caught;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch("PandaDoc send failed: 503");
  });

  // -------------------------------------------------------------------------
  // Timeout — polls never reach draft
  // -------------------------------------------------------------------------

  it("rejects with 'did not reach ready state' after timeout", async () => {
    const alwaysUploaded = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method?.toUpperCase() ?? "GET";
      if (method === "POST" && String(url).endsWith("/documents")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ id: "doc-abc" }),
          text: async () => "",
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ status: "document.uploaded" }),
        text: async () => "",
      });
    });

    vi.stubGlobal("fetch", alwaysUploaded);

    const promise = createAndSendContract(formData, CONTRACT_TEXT);
    // Attach rejection handler immediately so the promise is never unhandled.
    const caught = promise.catch((e: Error) => e);

    // Advance past the 60 000 ms maxWaitMs in 6 000 ms steps.
    for (let i = 0; i < 12; i++) {
      await vi.advanceTimersByTimeAsync(6000);
    }
    await vi.advanceTimersByTimeAsync(10000);

    const err = await caught;
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch("did not reach ready state");
  });
});
