import crypto from "crypto";
import PDFDocument from "pdfkit";
import type { ContractFormData } from "@/types/contract";

const PANDADOC_API_BASE = "https://api.pandadoc.com/public/v1";

function headers() {
  return {
    Authorization: `API-Key ${process.env.PANDADOC_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function createAndSendContract(
  formData: ContractFormData,
  contractText: string
): Promise<{ id: string; sandboxSkipped: boolean; brokerLink: string; buyerLink: string; sellerLink: string }> {
  const pdfBuffer = await contractTextToPdf(contractText, formData.propertyAddress);

  // Step 1: Upload PDF (multipart form — PandaDoc requires PDF or DOCX, not HTML)
  const form = new FormData();
  const blob = new Blob([pdfBuffer.buffer as ArrayBuffer], { type: "application/pdf" });
  form.append("file", blob, "contract.pdf");

  const documentData = {
    name: `Purchase Agreement — ${formData.propertyAddress}`,
    recipients: [
      {
        email: formData.brokerEmail,
        first_name: formData.brokerName.split(" ")[0],
        last_name: formData.brokerName.split(" ").slice(1).join(" ") || "",
        role: "Broker",
        signing_order: 1,
      },
      {
        email: formData.buyerEmail,
        first_name: formData.buyerName.split(" ")[0],
        last_name: formData.buyerName.split(" ").slice(1).join(" ") || "",
        role: "Buyer",
        signing_order: 2,
      },
      {
        email: formData.sellerEmail,
        first_name: formData.sellerName.split(" ")[0],
        last_name: formData.sellerName.split(" ").slice(1).join(" ") || "",
        role: "Seller",
        signing_order: 3,
      },
    ],
    metadata: {
      propertyAddress: formData.propertyAddress,
      agentEmail: formData.agentEmail,
      agentName: formData.agentName,
      offerPrice: String(formData.offerPrice),
      loanType: formData.loanType,
      downPaymentPercent: String(formData.downPaymentPercent),
    },
    tags: ["deed-app", "purchase-agreement"],
    parse_form_fields: false,
  };

  form.append("data", JSON.stringify(documentData));

  const createRes = await fetch(`${PANDADOC_API_BASE}/documents`, {
    method: "POST",
    headers: {
      Authorization: `API-Key ${process.env.PANDADOC_API_KEY}`,
      // No Content-Type — let FormData set it with the multipart boundary
    },
    body: form,
  });

  if (!createRes.ok) {
    const error = await createRes.text();
    throw new Error(`PandaDoc create failed: ${createRes.status} — ${error}`);
  }

  const created = await createRes.json();
  const docId: string = created.id;

  // Step 2: Poll until document reaches draft state
  await waitForDocumentReady(docId);

  // Step 3: Send document (starts the signing chain)
  const sendRes = await fetch(`${PANDADOC_API_BASE}/documents/${docId}/send`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      message: `Please review and sign the Purchase Agreement for ${formData.propertyAddress}.`,
      subject: `Signature Required: Purchase Agreement — ${formData.propertyAddress}`,
      silent: false,
    }),
  });

  if (!sendRes.ok) {
    const error = await sendRes.text();
    // Sandbox-only restriction: sending to recipients outside the PandaDoc org is blocked.
    // Treat this as a soft failure — document exists and is ready; sending is skipped.
    if (sendRes.status === 403 && error.includes("outside of your organization")) {
      return {
        id: docId,
        sandboxSkipped: true,
        brokerLink: `https://app.pandadoc.com/a/#/documents/${docId}`,
        buyerLink: `https://app.pandadoc.com/a/#/documents/${docId}`,
        sellerLink: `https://app.pandadoc.com/a/#/documents/${docId}`,
      };
    }
    throw new Error(`PandaDoc send failed: ${sendRes.status} — ${error}`);
  }

  // PandaDoc delivers signing links to each recipient directly via their own emails.
  return {
    id: docId,
    sandboxSkipped: false,
    brokerLink: `https://app.pandadoc.com/a/#/documents/${docId}`,
    buyerLink: `https://app.pandadoc.com/a/#/documents/${docId}`,
    sellerLink: `https://app.pandadoc.com/a/#/documents/${docId}`,
  };
}

async function waitForDocumentReady(docId: string, maxWaitMs = 60000): Promise<void> {
  const start = Date.now();
  const pollInterval = 6000; // 6s between checks to respect sandbox rate limits
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, pollInterval));
    const res = await fetch(`${PANDADOC_API_BASE}/documents/${docId}`, {
      headers: headers(),
    });
    if (res.ok) {
      const doc = await res.json();
      const status: string = doc.status;
      if (status === "document.draft" || status === "document.sent") return;
      if (status === "document.error") {
        throw new Error("PandaDoc document processing failed");
      }
      // document.uploaded / document.processing are intermediate — keep polling
    }
  }
  throw new Error("Document did not reach ready state in time");
}

function contractTextToPdf(text: string, propertyAddress: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 60, size: "LETTER" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Title
    doc.fontSize(14).font("Helvetica-Bold").text("RESIDENTIAL PURCHASE AGREEMENT", {
      align: "center",
    });
    doc.moveDown(0.4);
    doc.fontSize(10).font("Helvetica").fillColor("#666666").text(`Property: ${propertyAddress}`, {
      align: "center",
    });
    doc.moveDown(1.5);

    // Body — render each line, treating markdown headings as bold text
    doc.fillColor("#1a1a1a").fontSize(10).font("Helvetica");
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.startsWith("## ")) {
        doc.moveDown(0.5);
        doc.font("Helvetica-Bold").text(line.replace(/^## /, ""));
        doc.font("Helvetica");
        doc.moveDown(0.2);
      } else if (line.startsWith("# ")) {
        doc.moveDown(0.5);
        doc.fontSize(12).font("Helvetica-Bold").text(line.replace(/^# /, ""));
        doc.fontSize(10).font("Helvetica");
        doc.moveDown(0.2);
      } else if (line.startsWith("**") && line.endsWith("**")) {
        doc.font("Helvetica-Bold").text(line.replace(/\*\*/g, ""));
        doc.font("Helvetica");
      } else if (line.trim() === "" || line.trim() === "---") {
        doc.moveDown(0.5);
      } else {
        // Strip remaining markdown (bold inline, etc.)
        const clean = line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/^[-*]\s/, "• ");
        doc.text(clean, { lineGap: 2 });
      }
    }

    doc.end();
  });
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.PANDADOC_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature.toLowerCase(), "hex"),
      Buffer.from(expected.toLowerCase(), "hex")
    );
  } catch {
    return false;
  }
}
