import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@anthropic-ai/sdk", () => {
  const makeStream = (chunks: Array<{ type: string; delta?: { type: string; text: string } }>) => ({
    [Symbol.asyncIterator]: async function* () { for (const c of chunks) yield c; }
  });
  const mockStream = vi.fn(() => makeStream([
    { type: "content_block_delta", delta: { type: "text_delta", text: "PARTIES:" } },
    { type: "content_block_delta", delta: { type: "text_delta", text: "\nBuyer: Sam Lee" } },
    { type: "message_stop" },
  ]));
  return { default: vi.fn(() => ({ messages: { stream: mockStream } })) };
});

import { POST } from "@/app/api/generate/route";
import Anthropic from "@anthropic-ai/sdk";
import { CONTRACT_SYSTEM_PROMPT, buildContractPrompt } from "@/lib/contract-prompt";
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

async function collectStream(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
}

function makeRequest(data: ContractFormData): NextRequest {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  }) as unknown as NextRequest;
}

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with streamed text containing PARTIES:\\nBuyer: Sam Lee on valid input", async () => {
    const response = await POST(makeRequest(formData));
    expect(response.status).toBe(200);
    const text = await collectStream(response);
    expect(text).toContain("PARTIES:");
    expect(text).toContain("Buyer: Sam Lee");
  });

  it("skips non-text chunks like message_stop — output should not contain the word message_stop", async () => {
    const response = await POST(makeRequest(formData));
    const text = await collectStream(response);
    expect(text).not.toContain("message_stop");
  });

  it("sets Content-Type: text/plain; charset=utf-8 header", async () => {
    const response = await POST(makeRequest(formData));
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("sets Cache-Control: no-cache header", async () => {
    const response = await POST(makeRequest(formData));
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("returns 500 JSON with error 'Failed to generate contract' when Anthropic throws", async () => {
    const AnthropicMock = Anthropic as unknown as ReturnType<typeof vi.fn>;
    const streamMock = vi.fn(() => {
      throw new Error("rate_limit");
    });
    AnthropicMock.mockImplementationOnce(() => ({
      messages: { stream: streamMock },
    }));

    const response = await POST(makeRequest(formData));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Failed to generate contract" });
  });

  it("uses model claude-opus-4-6", async () => {
    const AnthropicMock = Anthropic as unknown as ReturnType<typeof vi.fn>;
    const streamSpy = vi.fn(() => ({
      [Symbol.asyncIterator]: async function* () {
        yield { type: "content_block_delta", delta: { type: "text_delta", text: "hi" } };
      },
    }));
    AnthropicMock.mockImplementationOnce(() => ({
      messages: { stream: streamSpy },
    }));

    await POST(makeRequest(formData));
    expect(streamSpy).toHaveBeenCalledOnce();
    const callArgs = (streamSpy.mock.calls as unknown[][])[0][0] as { model: string; system: string; messages: Array<{ role: string; content: string }> };
    expect(callArgs.model).toBe("claude-opus-4-6");
  });

  it("passes CONTRACT_SYSTEM_PROMPT as system message", async () => {
    const AnthropicMock = Anthropic as unknown as ReturnType<typeof vi.fn>;
    const streamSpy = vi.fn(() => ({
      [Symbol.asyncIterator]: async function* () {
        yield { type: "content_block_delta", delta: { type: "text_delta", text: "hi" } };
      },
    }));
    AnthropicMock.mockImplementationOnce(() => ({
      messages: { stream: streamSpy },
    }));

    await POST(makeRequest(formData));
    const callArgs = (streamSpy.mock.calls as unknown[][])[0][0] as { model: string; system: string; messages: Array<{ role: string; content: string }> };
    expect(callArgs.system).toBe(CONTRACT_SYSTEM_PROMPT);
  });

  it("passes buildContractPrompt output containing the propertyAddress as user message content", async () => {
    const AnthropicMock = Anthropic as unknown as ReturnType<typeof vi.fn>;
    const streamSpy = vi.fn(() => ({
      [Symbol.asyncIterator]: async function* () {
        yield { type: "content_block_delta", delta: { type: "text_delta", text: "hi" } };
      },
    }));
    AnthropicMock.mockImplementationOnce(() => ({
      messages: { stream: streamSpy },
    }));

    await POST(makeRequest(formData));
    const callArgs = (streamSpy.mock.calls as unknown[][])[0][0] as { model: string; system: string; messages: Array<{ role: string; content: string }> };
    const expectedContent = buildContractPrompt(formData);
    expect(callArgs.messages[0].role).toBe("user");
    expect(callArgs.messages[0].content).toBe(expectedContent);
    expect(callArgs.messages[0].content).toContain(formData.propertyAddress);
  });
});
