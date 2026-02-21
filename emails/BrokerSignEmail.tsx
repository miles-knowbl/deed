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

interface BrokerSignEmailProps {
  brokerName: string;
  agentName: string;
  buyerName: string;
  propertyAddress: string;
  offerPrice: number;
  signingLink: string;
}

export default function BrokerSignEmail({
  brokerName,
  agentName,
  buyerName,
  propertyAddress,
  offerPrice,
  signingLink,
}: BrokerSignEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Action required: Please sign the Purchase Agreement for {propertyAddress}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>deed</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Signature Required</Heading>
            <Text style={greeting}>Hi {brokerName},</Text>
            <Text style={paragraph}>
              {agentName} has submitted a purchase agreement that requires your
              signature as the authorized broker before it can be sent to the
              buyer for execution.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailsTitle}>Agreement Details</Text>
              <Text style={detailRow}><span style={label}>Property</span> {propertyAddress}</Text>
              <Text style={detailRow}><span style={label}>Buyer</span> {buyerName}</Text>
              <Text style={detailRow}><span style={label}>Offer Price</span> {formatUSD(offerPrice)}</Text>
              <Text style={detailRow}><span style={label}>Submitted by</span> {agentName}</Text>
            </Section>

            <Section style={ctaSection}>
              <Button style={button} href={signingLink}>
                Review & Sign Contract
              </Button>
            </Section>

            <Text style={smallNote}>
              Once you sign, the contract will automatically be sent to {buyerName}
              for their signature.
            </Text>
          </Section>

          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Sent via <strong>deed</strong> — Real estate contracts, simplified.
            </Text>
            <Text style={footerText}>
              This link is unique to you and should not be shared.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f9f8f7",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "560px",
};

const header = {
  padding: "32px 40px 0",
};

const logo = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#1a1a1a",
  letterSpacing: "-0.5px",
  margin: "0 0 32px",
};

const content = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "40px",
  border: "1px solid #e8e6e3",
  boxShadow: "0 2px 10px -3px rgba(0,0,0,0.08)",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "22px",
  fontWeight: "600",
  margin: "0 0 8px",
  letterSpacing: "-0.3px",
};

const greeting = {
  color: "#3a3a3a",
  fontSize: "15px",
  margin: "0 0 16px",
};

const paragraph = {
  color: "#5a5a5a",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const detailsBox = {
  backgroundColor: "#f9f8f7",
  borderRadius: "8px",
  padding: "20px 24px",
  margin: "0 0 28px",
  border: "1px solid #e8e6e3",
};

const detailsTitle = {
  color: "#9a9a9a",
  fontSize: "11px",
  fontWeight: "600",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  margin: "0 0 12px",
};

const detailRow = {
  color: "#3a3a3a",
  fontSize: "14px",
  margin: "0 0 6px",
  lineHeight: "1.5",
};

const label = {
  color: "#9a9a9a",
  fontSize: "13px",
  display: "inline-block",
  width: "100px",
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "0 0 20px",
};

const button = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "500",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
  letterSpacing: "-0.1px",
};

const smallNote = {
  color: "#9a9a9a",
  fontSize: "13px",
  lineHeight: "1.5",
  textAlign: "center" as const,
  margin: "0",
};

const hr = {
  borderColor: "#e8e6e3",
  margin: "32px 0 0",
};

const footer = {
  padding: "0 40px",
};

const footerText = {
  color: "#b0b0b0",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "4px 0",
  textAlign: "center" as const,
};
