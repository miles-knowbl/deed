import { NextRequest } from "next/server";
import { createAndSendContract } from "@/lib/pandadoc";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { render } from "@react-email/components";
import AgentStatusEmail from "@/emails/AgentStatusEmail";
import type { ContractFormData } from "@/types/contract";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  try {
    const { formData, contractText }: { formData: ContractFormData; contractText: string } =
      await req.json();

    // Create PandaDoc document + start signing chain.
    // PandaDoc sends its own signing request email to the broker automatically (silent: false).
    const { id: pandaDocId } = await createAndSendContract(formData, contractText);

    const resend = getResend();

    // Agent status ping only — PandaDoc handles the broker signing email directly.
    await resend.emails.send({
      from: FROM_EMAIL,
      to: formData.agentEmail,
      subject: `Sent to Broker — Purchase Agreement — ${formData.propertyAddress}`,
      html: await render(
        AgentStatusEmail({
          agentName: formData.agentName,
          propertyAddress: formData.propertyAddress,
          statusMessage: "Contract sent to broker for signature",
          signerName: formData.brokerName,
          signerRole: "Broker",
          nextStepMessage: `${formData.brokerName} has received the contract and will be notified to sign. Once they sign, it will automatically be sent to ${formData.buyerName} for their signature.`,
        })
      ),
    });

    return Response.json({ success: true, pandaDocId });
  } catch (error) {
    console.error("[/api/send-contract] Error:", error);
    return Response.json(
      { error: "Failed to send contract" },
      { status: 500 }
    );
  }
}
