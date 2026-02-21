import { NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/pandadoc";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { render } from "@react-email/components";
import BuyerSignEmail from "@/emails/BuyerSignEmail";
import SellerSignEmail from "@/emails/SellerSignEmail";
import FullyExecutedEmail from "@/emails/FullyExecutedEmail";
import AgentStatusEmail from "@/emails/AgentStatusEmail";

export const runtime = "nodejs";

interface PandaDocWebhookEvent {
  event: string;
  data: {
    id: string;
    name: string;
    status: string;
    metadata?: Record<string, string>;
    recipients?: Array<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role: string;
      has_completed: boolean;
      signing_order?: number;
    }>;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-pandadoc-signature") ?? "";

    // Verify webhook authenticity
    if (process.env.PANDADOC_WEBHOOK_SECRET && !verifyWebhookSignature(body, signature)) {
      console.warn("[webhook/pandadoc] Invalid signature");
      return new Response("Unauthorized", { status: 401 });
    }

    const events: PandaDocWebhookEvent[] = JSON.parse(body);

    for (const event of events) {
      await handleEvent(event);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[webhook/pandadoc] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

async function handleEvent(event: PandaDocWebhookEvent) {
  if (event.event !== "recipient_completed") return;

  const { data } = event;
  const metadata = data.metadata ?? {};
  const recipients = data.recipients ?? [];
  const resend = getResend();

  const completedRecipients = recipients.filter((r) => r.has_completed);
  const pendingRecipients = recipients.filter((r) => !r.has_completed);
  const allComplete = pendingRecipients.length === 0;

  // Determine who just signed (highest signing_order among completed)
  const justSigned = completedRecipients.sort(
    (a, b) => (b.signing_order ?? 0) - (a.signing_order ?? 0)
  )[0];

  if (!justSigned) return;

  const agentEmail = metadata.agentEmail ?? "";
  const agentName = metadata.agentName ?? "Your Agent";
  const propertyAddress = data.name.replace("Purchase Agreement — ", "");

  // Broker (signing_order 1) just signed → email buyer
  if (justSigned.signing_order === 1) {
    const buyer = recipients.find((r) => r.signing_order === 2);
    if (buyer) {
      const pandaDocLink = `https://app.pandadoc.com/a/#/documents/${data.id}`;

      await resend.emails.send({
        from: FROM_EMAIL,
        to: buyer.email,
        subject: `Your Purchase Agreement is Ready to Sign — ${propertyAddress}`,
        html: await render(
          BuyerSignEmail({
            buyerName: `${buyer.first_name} ${buyer.last_name}`.trim(),
            agentName,
            propertyAddress,
            offerPrice: Number(metadata.offerPrice ?? 0),
            loanType: metadata.loanType ?? "Conventional",
            downPaymentPercent: Number(metadata.downPaymentPercent ?? 20),
            signingLink: pandaDocLink,
          })
        ),
      });
    }

    // Ping agent
    if (agentEmail) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: agentEmail,
        subject: `Broker Signed — Purchase Agreement — ${propertyAddress}`,
        html: await render(
          AgentStatusEmail({
            agentName,
            propertyAddress,
            statusMessage: "Broker has signed",
            signerName: `${justSigned.first_name} ${justSigned.last_name}`.trim(),
            signerRole: "Broker",
            nextStepMessage: buyer
              ? `Contract sent to ${buyer.first_name} ${buyer.last_name} (buyer) for signature.`
              : "Buyer will be notified shortly.",
          })
        ),
      });
    }
  }

  // Buyer (signing_order 2) just signed → email seller
  if (justSigned.signing_order === 2) {
    const seller = recipients.find((r) => r.signing_order === 3);
    if (seller) {
      const pandaDocLink = `https://app.pandadoc.com/a/#/documents/${data.id}`;
      const buyer = recipients.find((r) => r.signing_order === 2);

      await resend.emails.send({
        from: FROM_EMAIL,
        to: seller.email,
        subject: `Offer Received for ${propertyAddress} — Review & Sign`,
        html: await render(
          SellerSignEmail({
            sellerName: `${seller.first_name} ${seller.last_name}`.trim(),
            buyerName: buyer ? `${buyer.first_name} ${buyer.last_name}`.trim() : "Buyer",
            agentName,
            propertyAddress,
            offerPrice: Number(metadata.offerPrice ?? 0),
            loanType: metadata.loanType ?? "Conventional",
            downPaymentPercent: Number(metadata.downPaymentPercent ?? 20),
            signingLink: pandaDocLink,
          })
        ),
      });
    }

    // Ping agent
    if (agentEmail) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: agentEmail,
        subject: `Buyer Signed — Purchase Agreement — ${propertyAddress}`,
        html: await render(
          AgentStatusEmail({
            agentName,
            propertyAddress,
            statusMessage: "Buyer has signed",
            signerName: `${justSigned.first_name} ${justSigned.last_name}`.trim(),
            signerRole: "Buyer",
            nextStepMessage: seller
              ? `Contract sent to ${seller.first_name} ${seller.last_name} (seller) for signature.`
              : "Seller will be notified shortly.",
          })
        ),
      });
    }
  }

  // All parties signed → fully executed emails to everyone
  if (allComplete) {
    const today = new Date();
    const closingDate = new Date(today);
    closingDate.setDate(today.getDate() + 30);
    const closingDateStr = closingDate.toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    const broker = recipients.find((r) => r.signing_order === 1);
    const buyer = recipients.find((r) => r.signing_order === 2);
    const seller = recipients.find((r) => r.signing_order === 3);

    const allParties = [
      { ...broker, role: "Broker" },
      { ...buyer, role: "Buyer" },
      { ...seller, role: "Seller" },
    ].filter(Boolean);

    const sharedProps = {
      buyerName: buyer ? `${buyer.first_name} ${buyer.last_name}`.trim() : "Buyer",
      sellerName: seller ? `${seller.first_name} ${seller.last_name}`.trim() : "Seller",
      agentName,
      brokerName: broker ? `${broker.first_name} ${broker.last_name}`.trim() : "Broker",
      propertyAddress,
      offerPrice: Number(metadata.offerPrice ?? 0),
      closingDate: closingDateStr,
    };

    for (const party of allParties) {
      if (!party?.email) continue;
      await resend.emails.send({
        from: FROM_EMAIL,
        to: party.email,
        subject: `Fully Executed: Purchase Agreement for ${propertyAddress}`,
        html: await render(
          FullyExecutedEmail({
            recipientName: `${party.first_name} ${party.last_name}`.trim(),
            ...sharedProps,
          })
        ),
      });
    }

    // Also notify agent
    if (agentEmail) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: agentEmail,
        subject: `Fully Executed — Purchase Agreement — ${propertyAddress}`,
        html: await render(
          AgentStatusEmail({
            agentName,
            propertyAddress,
            statusMessage: "All parties have signed — contract fully executed",
            signerName: seller ? `${seller.first_name} ${seller.last_name}`.trim() : "Seller",
            signerRole: "Seller",
            nextStepMessage: `The Purchase Agreement for ${propertyAddress} is now fully executed. All parties have received a copy. Target closing: ${closingDateStr}.`,
          })
        ),
      });
    }
  }
}
