import {
  Body,
  Button,
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

interface SellerSignEmailProps {
  sellerName: string;
  buyerName: string;
  agentName: string;
  propertyAddress: string;
  offerPrice: number;
  loanType: string;
  downPaymentPercent: number;
  signingLink: string;
}

export default function SellerSignEmail({
  sellerName,
  buyerName,
  agentName,
  propertyAddress,
  offerPrice,
  loanType,
  downPaymentPercent,
  signingLink,
}: SellerSignEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Offer received for {propertyAddress} — please review and sign</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>deed</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Offer Received</Heading>
            <Text style={greeting}>Hi {sellerName},</Text>
            <Text style={paragraph}>
              You have received a purchase offer for <strong>{propertyAddress}</strong>.
              The offer has been signed by both the buyer's broker and the buyer.
              Please review and sign to execute this agreement.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailsTitle}>Offer Summary</Text>
              <Text style={detailRow}><span style={labelStyle}>Property</span> {propertyAddress}</Text>
              <Text style={detailRow}><span style={labelStyle}>Offer Price</span> {formatUSD(offerPrice)}</Text>
              <Text style={detailRow}><span style={labelStyle}>Down Payment</span> {downPaymentPercent}% ({formatUSD(offerPrice * downPaymentPercent / 100)})</Text>
              <Text style={detailRow}><span style={labelStyle}>Loan Type</span> {loanType}</Text>
              <Text style={detailRow}><span style={labelStyle}>Buyer</span> {buyerName}</Text>
              <Text style={detailRow}><span style={labelStyle}>Buyer's Agent</span> {agentName}</Text>
            </Section>

            <Section style={ctaSection}>
              <Button style={button} href={signingLink}>
                Review Offer & Sign
              </Button>
            </Section>

            <Text style={smallNote}>
              Please review the full agreement carefully before signing. You may
              wish to consult with your own agent or attorney.
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
const h1 = { color: "#1a1a1a", fontSize: "22px", fontWeight: "600", margin: "0 0 8px", letterSpacing: "-0.3px" };
const greeting = { color: "#3a3a3a", fontSize: "15px", margin: "0 0 16px" };
const paragraph = { color: "#5a5a5a", fontSize: "15px", lineHeight: "1.6", margin: "0 0 24px" };
const detailsBox = { backgroundColor: "#f9f8f7", borderRadius: "8px", padding: "20px 24px", margin: "0 0 28px", border: "1px solid #e8e6e3" };
const detailsTitle = { color: "#9a9a9a", fontSize: "11px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase" as const, margin: "0 0 12px" };
const detailRow = { color: "#3a3a3a", fontSize: "14px", margin: "0 0 6px", lineHeight: "1.5" };
const labelStyle = { color: "#9a9a9a", fontSize: "13px", display: "inline-block", width: "110px" };
const ctaSection = { textAlign: "center" as const, margin: "0 0 20px" };
const button = { backgroundColor: "#1a1a1a", borderRadius: "8px", color: "#ffffff", fontSize: "15px", fontWeight: "500", textDecoration: "none", textAlign: "center" as const, display: "inline-block", padding: "14px 32px" };
const smallNote = { color: "#9a9a9a", fontSize: "13px", lineHeight: "1.5", textAlign: "center" as const, margin: "0" };
const hr = { borderColor: "#e8e6e3", margin: "32px 0 0" };
const footer = { padding: "0 40px" };
const footerText = { color: "#b0b0b0", fontSize: "12px", lineHeight: "1.5", margin: "4px 0", textAlign: "center" as const };
