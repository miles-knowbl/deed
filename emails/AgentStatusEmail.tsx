import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "#";

interface AgentStatusEmailProps {
  agentName: string;
  propertyAddress: string;
  statusMessage: string;
  signerName: string;
  signerRole: string;
  nextStepMessage: string;
}

export default function AgentStatusEmail({
  agentName,
  propertyAddress,
  statusMessage,
  signerName,
  signerRole,
  nextStepMessage,
}: AgentStatusEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{statusMessage} — {propertyAddress}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Link href={APP_URL} style={logoLink}>deed</Link>
          </Section>

          <Section style={content}>
            <Section style={statusBadge}>
              <Text style={statusDot}>●</Text>
              <Text style={statusLabel}>Signature Update</Text>
            </Section>

            <Heading style={h1}>{statusMessage}</Heading>
            <Text style={greeting}>Hi {agentName},</Text>
            <Text style={paragraph}>
              <strong>{signerName}</strong> ({signerRole}) has signed the Purchase
              Agreement for <strong>{propertyAddress}</strong>.
            </Text>

            <Section style={nextBox}>
              <Text style={nextLabel}>What happens next</Text>
              <Text style={nextText}>{nextStepMessage}</Text>
            </Section>
          </Section>

          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Sent via <strong>deed</strong> — Real estate contracts, simplified.
            </Text>
            <Link href={APP_URL} style={tryLink}>Try Deed →</Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#f9f8f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" };
const container = { margin: "0 auto", padding: "20px 0 48px", maxWidth: "560px" };
const header = { padding: "32px 40px 0" };
const logoLink = { fontSize: "22px", fontWeight: "700", color: "#1a1a1a", letterSpacing: "-0.5px", margin: "0 0 32px", textDecoration: "none", display: "inline-block" };
const tryLink = { display: "block", color: "#1a1a1a", fontSize: "12px", fontWeight: "600", textDecoration: "none", textAlign: "center" as const, margin: "12px 0 0", letterSpacing: "0.02em" };
const content = { backgroundColor: "#ffffff", borderRadius: "12px", padding: "40px", border: "1px solid #e8e6e3", boxShadow: "0 2px 10px -3px rgba(0,0,0,0.08)" };
const statusBadge = { display: "flex" as const, alignItems: "center", gap: "6px", marginBottom: "16px" };
const statusDot = { color: "#4a4a4a", fontSize: "10px", margin: "0 4px 0 0", display: "inline" };
const statusLabel = { color: "#9a9a9a", fontSize: "11px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase" as const, margin: "0", display: "inline" };
const h1 = { color: "#1a1a1a", fontSize: "20px", fontWeight: "600", margin: "0 0 8px", letterSpacing: "-0.3px" };
const greeting = { color: "#3a3a3a", fontSize: "15px", margin: "0 0 16px" };
const paragraph = { color: "#5a5a5a", fontSize: "15px", lineHeight: "1.6", margin: "0 0 20px" };
const nextBox = { backgroundColor: "#f9f8f7", borderRadius: "8px", padding: "16px 20px", border: "1px solid #e8e6e3" };
const nextLabel = { color: "#9a9a9a", fontSize: "11px", fontWeight: "600", letterSpacing: "0.08em", textTransform: "uppercase" as const, margin: "0 0 6px" };
const nextText = { color: "#3a3a3a", fontSize: "14px", lineHeight: "1.5", margin: "0" };
const hr = { borderColor: "#e8e6e3", margin: "32px 0 0" };
const footer = { padding: "0 40px" };
const footerText = { color: "#b0b0b0", fontSize: "12px", lineHeight: "1.5", margin: "4px 0", textAlign: "center" as const };
