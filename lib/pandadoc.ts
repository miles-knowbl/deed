import crypto from "crypto";
import PDFDocument from "pdfkit";
import { PDFDocument as LibPDF, PDFName, PDFString } from "pdf-lib";
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
  const rawPdf = await contractTextToPdf(contractText, formData.propertyAddress);
  const pdfBuffer = await addSignatureFields(rawPdf);

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
    parse_form_fields: true,
    fields: {
      broker_signature: { role: "Broker" },
      buyer_signature: { role: "Buyer" },
      seller_signature: { role: "Seller" },
    },
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

async function addSignatureFields(pdfBuffer: Buffer): Promise<Buffer> {
  const pdfDoc = await LibPDF.load(pdfBuffer);
  const sigPage = pdfDoc.addPage([612, 792]); // Letter size

  // Draw signature section labels and lines
  const { width, height } = sigPage.getSize();
  const margin = 60;
  const colRight = width / 2 + margin;

  // Helper to draw a signature block (label + line) at a given y
  function drawSigBlock(label: string, x: number, y: number, lineWidth: number) {
    sigPage.drawText(label, { x, y: y + 20, size: 9 });
    sigPage.drawLine({ start: { x, y }, end: { x: x + lineWidth, y }, thickness: 0.5 });
  }

  sigPage.drawText("SIGNATURE PAGE", { x: margin, y: height - 60, size: 13 });
  sigPage.drawText(`Purchase Agreement`, { x: margin, y: height - 80, size: 10 });

  drawSigBlock("Broker Signature", margin, 580, 200);
  drawSigBlock("Date", colRight, 580, 160);

  drawSigBlock("Buyer Signature", margin, 440, 200);
  drawSigBlock("Date", colRight, 440, 160);

  drawSigBlock("Seller / Listing Agent Signature", margin, 300, 200);
  drawSigBlock("Date", colRight, 300, 160);

  // Build AcroForm with signature fields overlaid on signature lines
  const context = pdfDoc.context;
  const fieldsArray = context.obj([]);
  const acroFormRef = context.nextRef();
  context.assign(acroFormRef, context.obj({
    Fields: fieldsArray,
    SigFlags: context.obj(3),
  }));
  pdfDoc.catalog.set(PDFName.of("AcroForm"), acroFormRef);

  function createSigWidget(name: string, rect: [number, number, number, number]) {
    const ref = context.nextRef();
    context.assign(ref, context.obj({
      Type: PDFName.of("Annot"),
      Subtype: PDFName.of("Widget"),
      FT: PDFName.of("Sig"),
      T: PDFString.of(name),
      Rect: context.obj(rect),
      P: sigPage.ref,
      F: context.obj(4),
    }));
    let annots = sigPage.node.get(PDFName.of("Annots"));
    if (!annots) { annots = context.obj([]); sigPage.node.set(PDFName.of("Annots"), annots); }
    (annots as ReturnType<typeof context.obj>).push(ref);
    (fieldsArray as ReturnType<typeof context.obj>).push(ref);
  }

  createSigWidget("broker_signature", [margin, 530, margin + 200, 580]);
  createSigWidget("buyer_signature",  [margin, 390, margin + 200, 440]);
  createSigWidget("seller_signature", [margin, 250, margin + 200, 300]);

  return Buffer.from(await pdfDoc.save());
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
