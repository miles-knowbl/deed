"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, Send, ArrowLeft, CheckCircle2, Loader2, Users } from "lucide-react";
import Logo from "@/components/Logo";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useContractStore } from "@/store/contract";
import { containerVariants, cardItemVariants } from "@/lib/motion-variants";
import { formatUSD } from "@/lib/utils";

export default function ContractReview() {
  const router = useRouter();
  const { formData, contractText, setPandaDocId } = useContractStore();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sandboxSkipped, setSandboxSkipped] = useState(false);

  if (!formData || !contractText) {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  const handleSend = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/send-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData, contractText }),
      });

      if (!res.ok) throw new Error("Failed to send");

      const { pandaDocId, sandboxSkipped: skipped } = await res.json();
      setPandaDocId(pandaDocId);
      setSandboxSkipped(!!skipped);
      setSent(true);
      if (skipped) {
        toast.info("Sandbox mode — document created but not sent (PandaDoc org restriction).");
      } else {
        toast.success("Contract sent to broker for signature!");
      }
    } catch {
      toast.error("Failed to send contract. Please try again.");
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#f9f8f7] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-10 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
            className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-5"
          >
            <CheckCircle2 className="w-7 h-7 text-neutral-900" />
          </motion.div>

          <h2 className="text-xl font-semibold text-neutral-900 mb-2 tracking-tight">
            {sandboxSkipped ? "Document Created" : "Contract Sent"}
          </h2>
          <p className="text-neutral-500 text-sm leading-relaxed mb-6">
            {sandboxSkipped ? (
              <>
                Document created successfully in PandaDoc.{" "}
                <span className="text-amber-600 font-medium">Sandbox mode</span> — sending to external recipients is blocked by PandaDoc until a production API key is configured.
              </>
            ) : (
              <>
                The purchase agreement has been sent to{" "}
                <strong className="text-neutral-700">{formData.brokerName}</strong> for their
                signature. The signing chain will proceed automatically.
              </>
            )}
          </p>

          <div className="bg-neutral-50 rounded-xl p-4 text-left space-y-2.5 mb-6 border border-neutral-100">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest mb-3">Signing Order</p>
            {[
              { step: 1, name: formData.brokerName, role: "Broker", status: "Notified" },
              { step: 2, name: formData.buyerName, role: "Buyer", status: "Waiting" },
              { step: 3, name: formData.sellerName, role: "Seller / Agent", status: "Waiting" },
            ].map(({ step, name, role, status }) => (
              <div key={step} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 text-[10px] font-semibold flex items-center justify-center flex-shrink-0">{step}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{name}</p>
                  <p className="text-xs text-neutral-400">{role}</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${step === 1 ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"}`}>
                  {status}
                </span>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => { router.push("/"); useContractStore.getState().reset(); }}
          >
            Start a New Contract
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f8f7] flex flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/generating")}
              className="text-neutral-400 hover:text-neutral-700 transition-colors p-1 -ml-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Logo iconSize={28} textSize="text-base" gap="gap-2" />
          </div>
          <span className="text-xs text-neutral-400 font-medium uppercase tracking-wide">Review Contract</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 flex-1 flex flex-col w-full gap-6">
        {/* Summary bar */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          {[
            { label: "Property", value: formData.propertyAddress },
            { label: "Offer Price", value: formatUSD(formData.offerPrice) },
            { label: "Buyer", value: formData.buyerName },
            { label: "Loan", value: `${formData.downPaymentPercent}% down · ${formData.loanType}` },
          ].map(({ label, value }) => (
            <motion.div
              key={label}
              variants={cardItemVariants}
              className="bg-white rounded-xl border border-neutral-200 px-4 py-3"
            >
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest mb-0.5">{label}</p>
              <p className="text-sm font-medium text-neutral-900 truncate">{value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Contract paper */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex-1"
        >
          <div className="border-b border-neutral-100 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-xs text-neutral-500 font-medium">Residential Purchase Agreement</span>
            </div>
            <span className="text-xs text-neutral-400">{contractText.length.toLocaleString()} characters</span>
          </div>

          <div className="h-[calc(100dvh-360px)] md:h-[calc(100dvh-440px)] min-h-[280px] overflow-y-auto px-4 sm:px-8 py-6">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-base font-bold text-neutral-900 mt-6 mb-2 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest mt-6 mb-2 first:mt-0">{children}</h2>,
                p: ({ children }) => <p className="text-[13px] text-neutral-800 leading-relaxed mb-2">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="text-[13px] text-neutral-800 leading-relaxed">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-neutral-900">{children}</strong>,
                hr: () => <hr className="border-neutral-100 my-4" />,
              }}
            >
              {contractText}
            </ReactMarkdown>
          </div>
        </motion.div>

        {/* Signing chain preview */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="bg-white rounded-xl border border-neutral-200 px-5 py-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-3.5 h-3.5 text-neutral-400" />
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">Signing Chain</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { name: formData.brokerName, role: "Broker", step: 1 },
              { name: formData.buyerName, role: "Buyer", step: 2 },
              { name: formData.sellerName, role: "Seller", step: 3 },
            ].map(({ name, role, step }, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-neutral-50 rounded-lg px-3 py-2 border border-neutral-100">
                  <span className="w-4 h-4 rounded-full bg-neutral-200 text-neutral-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0">{step}</span>
                  <div>
                    <p className="text-xs font-medium text-neutral-800 leading-none">{name}</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{role}</p>
                  </div>
                </div>
                {i < 2 && <span className="hidden sm:inline text-neutral-300 text-sm">→</span>}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Send button */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="pb-4"
        >
          <Button
            size="lg"
            className="w-full"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending to broker for signature...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Approve & Send Contract
              </>
            )}
          </Button>
          <p className="text-center text-xs text-neutral-400 mt-2 truncate px-4">
            Sends to {formData.brokerName} → {formData.buyerName} → {formData.sellerName}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
