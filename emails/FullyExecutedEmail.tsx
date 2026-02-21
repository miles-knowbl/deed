import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { formatUSD } from "@/lib/utils";

interface FullyExecutedEmailProps {
  recipientName: string;
  buyerName: string;
  sellerName: string;
  agentName: string;
  brokerName: string;
  propertyAddress: string;
  offerPrice: number;
}

export default function FullyExecutedEmail({
  recipientName,
  buyerName,
  sellerName,
  agentName,
  brokerName,
  propertyAddress,
  offerPrice,
}: FullyExecutedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Fully executed: Purchase Agreement for {propertyAddress} is complete</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>deed</Text>
          </Section>

          <Section style={content}>
            <Section style={badge}>
              <Text style={badgeText}>Fully Executed</Text>
            </Section>

            <Heading style={h1}>Purchase Agreement Complete</Heading>
            <Text style={greeting}>Hi {recipientName},</Text>
            <Text style={paragraph}>
              All parties have signed the Purchase Agreement for{" "}
              <strong>{propertyAddress}</strong>. This agreement is now fully
              executed and legally binding.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailsTitle}>Executed Agreement</Text>
              <Text style={detailRow}><span style={labelStyle}>Property</span> {propertyAddress}</Text>
              <Text style={detailRow}><span style={labelStyle}>Purchase Price</span> {formatUSD(offerPrice)}</Text>
              <Text style={detailRow}><span style={labelStyle}>Buyer</span> {buyerName}</Text>
              <Text style={detailRow}><span style={labelStyle}>Seller</span> {sellerName}</Text>
              <Text style={detailRow}><span style={labelStyle}>Agent</span> {agentName}</Text>
              <Text style={detailRow}><span style={labelStyle}>Broker</span> {brokerName}</Text>
              <Text style={detailRow}><span style={labelStyle}>Target Closing</span> Per the agreement</Text>
            </Section>

            <Text style={paragraph}>
              A copy of the fully executed contract has been saved to your PandaDoc
              account and can be accessed at any time. Please retain this confirmation
              for your records.
            </Text>

            <Text style={paragraph}>
              Next steps will be coordinated by {agentName}. If you have any
              questions, please reach out to them directly.
            </Text>
          </Section>

          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Sent via <strong>deed</strong> — Real estate contracts, simplified.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#f9f8f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const container = { margin: "0 auto", padding: "20px 0 48px", maxWidth: "560px" };
const header = { padding: "32px 40px 0" };
const logo = { fontSize: "22px", fontWeight: "700", color: "#1a1a1a", letterSpacing: "-0.5px", margin: "0 0 32px" };
const content = { backgroundColor: "#ffffff", borderRadius: "12px", padding: "40px", border: "1px solid #e8e6e3", boxShadow: "0 2px 10px -3px rgba(0,0,0,0.08)" };
const badge = { marginBottom: "20px" };
const badgeText = { display: "inline-block" as const, backgroundColor: "#f0f0f0", color: "#3a3a3a", fontSize: "11px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase" as const, padding: "4px 12px", borderRadius: "20px", margin: "0" };
const h1 = { color: "#1a1a1a", fontSize: "22px", fontWeight: "600", margin: "0 0 8px", letterSpacing: "-0.3px" };
const greeting = { color: "#3a3a3a", fontSize: "15px", margin: "0 0 16px" };
const paragraph = { color: "#5a5a5a", fontSize: "15px", lineHeight: "1.6", margin: "0 0 20px" };
const detailsBox = { backgroundColor: "#f9f8f7", borderRadius: "8px", padding: "20px 24px", margin: "0 0 28px", border: "1px solid #e8e6e3" };
const detailsTitle = { color: "#9a9a9a", fontSize: "11px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase" as const, margin: "0 0 12px" };
const detailRow = { color: "#3a3a3a", fontSize: "14px", margin: "0 0 6px", lineHeight: "1.5" };
const labelStyle = { color: "#9a9a9a", fontSize: "13px", display: "inline-block", width: "110px" };
const hr = { borderColor: "#e8e6e3", margin: "32px 0 0" };
const footer = { padding: "0 40px" };
const footerText = { color: "#b0b0b0", fontSize: "12px", lineHeight: "1.5", margin: "4px 0", textAlign: "center" as const };
