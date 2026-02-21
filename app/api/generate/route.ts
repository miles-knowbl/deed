import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { buildContractPrompt, CONTRACT_SYSTEM_PROMPT } from "@/lib/contract-prompt";
import type { ContractFormData } from "@/types/contract";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const formData: ContractFormData = await req.json();

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const stream = await client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 8192,
      system: CONTRACT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildContractPrompt(formData),
        },
      ],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[/api/generate] Error:", error);
    return Response.json(
      { error: "Failed to generate contract" },
      { status: 500 }
    );
  }
}
