import crypto from "crypto";
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
): Promise<{ id: string; brokerLink: string; buyerLink: string; sellerLink: string }> {
  const htmlContent = contractTextToHtml(contractText, formData.propertyAddress);

  // Step 1: Upload document as HTML file (multipart form)
  const form = new FormData();
  const blob = new Blob([htmlContent], { type: "text/html" });
  form.append("file", blob, "contract.html");

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
      // Note: no Content-Type header — let FormData set it with boundary
    },
    body: form,
  });

  if (!createRes.ok) {
    const error = await createRes.text();
    throw new Error(`PandaDoc create failed: ${createRes.status} — ${error}`);
  }

  const created = await createRes.json();
  const docId: string = created.id;

  // Step 2: Poll until document is ready
  await waitForDocumentReady(docId);

  // Step 3: Send document (starts signing workflow)
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
    throw new Error(`PandaDoc send failed: ${sendRes.status} — ${error}`);
  }

  // PandaDoc sends signing links to recipients via email automatically.
  // Return the document view URL for our own reference.
  return {
    id: docId,
    brokerLink: `https://app.pandadoc.com/a/#/documents/${docId}`,
    buyerLink: `https://app.pandadoc.com/a/#/documents/${docId}`,
    sellerLink: `https://app.pandadoc.com/a/#/documents/${docId}`,
  };
}

async function waitForDocumentReady(docId: string, maxWaitMs = 20000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${PANDADOC_API_BASE}/documents/${docId}`, {
      headers: headers(),
    });
    if (res.ok) {
      const doc = await res.json();
      const status: string = doc.status;
      if (status === "document.draft" || status === "document.sent") return;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Document did not reach ready state in time");
}

function contractTextToHtml(text: string, propertyAddress: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const withBreaks = escaped.replace(/\n/g, "<br/>");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 40px; }
    h1 { font-size: 16pt; text-align: center; margin-bottom: 8px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 32px; font-size: 10pt; }
    .body { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>RESIDENTIAL PURCHASE AGREEMENT</h1>
  <div class="subtitle">Property: ${propertyAddress}</div>
  <div class="body">${withBreaks}</div>
</body>
</html>`;
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
