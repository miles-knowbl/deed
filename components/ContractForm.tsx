"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContractStore } from "@/store/contract";
import { containerVariants, cardItemVariants } from "@/lib/motion-variants";
import type { ContractFormData, LoanType } from "@/types/contract";

const ADDENDUM_LIST = [
  { key: "homeInspection", label: "Home Inspection Contingency" },
  { key: "financingContingency", label: "Financing Contingency" },
  { key: "appraisalContingency", label: "Appraisal Contingency" },
  { key: "saleOfBuyersHome", label: "Sale of Buyer\u2019s Current Home Contingency" },
  { key: "hoaDisclosure", label: "HOA / Condo Association Disclosure" },
  { key: "asIs", label: "As-Is Sale Addendum" },
  { key: "leadBasedPaint", label: "Lead-Based Paint Disclosure (pre-1978)" },
  { key: "wellSeptic", label: "Well & Septic Inspection Addendum" },
  { key: "radonTesting", label: "Radon Testing Addendum" },
  { key: "sellerConcessions", label: "Seller Concessions / Closing Cost Assistance" },
] as const;

const LOAN_TYPES: LoanType[] = ["Conventional", "FHA", "VA", "Cash", "USDA"];

const defaultAddendums = {
  homeInspection: false,
  financingContingency: false,
  appraisalContingency: false,
  saleOfBuyersHome: false,
  hoaDisclosure: false,
  asIs: false,
  leadBasedPaint: false,
  wellSeptic: false,
  radonTesting: false,
  sellerConcessions: false,
};

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div variants={cardItemVariants} className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">{title}</p>
        <div className="flex-1 h-px bg-neutral-100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </motion.div>
  );
}

function Field({
  label,
  error,
  children,
  full,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-full" : ""}`}>
      <Label>{label}</Label>
      {children}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-500"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

export default function ContractForm() {
  const router = useRouter();
  const { setFormData } = useContractStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ContractFormData | string, string>>>({});

  const [form, setForm] = useState<{
    brokerName: string;
    brokerEmail: string;
    agentName: string;
    agentEmail: string;
    buyerName: string;
    buyerEmail: string;
    sellerName: string;
    sellerEmail: string;
    propertyAddress: string;
    offerPrice: string;
    downPaymentPercent: string;
    loanType: LoanType;
    specialRequests: string;
    addendums: typeof defaultAddendums;
  }>({
    brokerName: "",
    brokerEmail: "",
    agentName: "",
    agentEmail: "",
    buyerName: "",
    buyerEmail: "",
    sellerName: "",
    sellerEmail: "",
    propertyAddress: "",
    offerPrice: "",
    downPaymentPercent: "20",
    loanType: "Conventional",
    specialRequests: "",
    addendums: { ...defaultAddendums },
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e: typeof errors = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.brokerName) e.brokerName = "Required";
    if (!emailRe.test(form.brokerEmail)) e.brokerEmail = "Valid email required";
    if (!form.agentName) e.agentName = "Required";
    if (!emailRe.test(form.agentEmail)) e.agentEmail = "Valid email required";
    if (!form.buyerName) e.buyerName = "Required";
    if (!emailRe.test(form.buyerEmail)) e.buyerEmail = "Valid email required";
    if (!form.sellerName) e.sellerName = "Required";
    if (!emailRe.test(form.sellerEmail)) e.sellerEmail = "Valid email required";
    if (!form.propertyAddress) e.propertyAddress = "Required";
    const price = parseFloat(form.offerPrice.replace(/[^0-9.]/g, ""));
    if (!price || price <= 0) e.offerPrice = "Valid offer price required";
    const dp = parseFloat(form.downPaymentPercent);
    if (isNaN(dp) || dp < 0 || dp > 100) e.downPaymentPercent = "0–100";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the errors above before continuing.");
      return;
    }

    setLoading(true);
    const data: ContractFormData = {
      brokerName: form.brokerName,
      brokerEmail: form.brokerEmail,
      agentName: form.agentName,
      agentEmail: form.agentEmail,
      buyerName: form.buyerName,
      buyerEmail: form.buyerEmail,
      sellerName: form.sellerName,
      sellerEmail: form.sellerEmail,
      propertyAddress: form.propertyAddress,
      offerPrice: parseFloat(form.offerPrice.replace(/[^0-9.]/g, "")),
      downPaymentPercent: parseFloat(form.downPaymentPercent),
      loanType: form.loanType,
      specialRequests: form.specialRequests,
      addendums: form.addendums,
    };

    setFormData(data);
    router.push("/generating");
  };

  return (
    <div className="min-h-screen bg-[#f9f8f7]">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-neutral-900">deed</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 mb-2">
            New Purchase Agreement
          </h1>
          <p className="text-neutral-500 text-base">
            Fill in the details below and we&apos;ll draft a complete, professional contract in seconds.
          </p>
        </motion.div>

        {/* Form card */}
        <form onSubmit={handleSubmit}>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-8"
          >
            {/* Broker */}
            <FieldGroup title="Broker">
              <Field label="Broker Name" error={errors.brokerName}>
                <Input value={form.brokerName} onChange={set("brokerName")} placeholder="Jane Smith" />
              </Field>
              <Field label="Broker Email" error={errors.brokerEmail}>
                <Input type="email" value={form.brokerEmail} onChange={set("brokerEmail")} placeholder="jane@brokerage.com" />
              </Field>
            </FieldGroup>

            {/* Selling Agent */}
            <FieldGroup title="Selling Agent (You)">
              <Field label="Your Name" error={errors.agentName}>
                <Input value={form.agentName} onChange={set("agentName")} placeholder="Alex Johnson" />
              </Field>
              <Field label="Your Email" error={errors.agentEmail}>
                <Input type="email" value={form.agentEmail} onChange={set("agentEmail")} placeholder="alex@realty.com" />
              </Field>
            </FieldGroup>

            {/* Buying Client */}
            <FieldGroup title="Buying Client">
              <Field label="Buyer Name" error={errors.buyerName}>
                <Input value={form.buyerName} onChange={set("buyerName")} placeholder="Sam Lee" />
              </Field>
              <Field label="Buyer Email" error={errors.buyerEmail}>
                <Input type="email" value={form.buyerEmail} onChange={set("buyerEmail")} placeholder="sam@email.com" />
              </Field>
            </FieldGroup>

            {/* Seller */}
            <FieldGroup title="Seller / Seller's Agent">
              <Field label="Seller Name" error={errors.sellerName}>
                <Input value={form.sellerName} onChange={set("sellerName")} placeholder="Morgan Davis" />
              </Field>
              <Field label="Seller Email" error={errors.sellerEmail}>
                <Input type="email" value={form.sellerEmail} onChange={set("sellerEmail")} placeholder="morgan@email.com" />
              </Field>
            </FieldGroup>

            {/* Property */}
            <FieldGroup title="Property">
              <Field label="Property Address" error={errors.propertyAddress} full>
                <Input value={form.propertyAddress} onChange={set("propertyAddress")} placeholder="123 Main St, Austin, TX 78701" />
              </Field>
            </FieldGroup>

            {/* Offer */}
            <FieldGroup title="Offer Terms">
              <Field label="Offer Price (USD)" error={errors.offerPrice}>
                <Input
                  value={form.offerPrice}
                  onChange={set("offerPrice")}
                  placeholder="450000"
                  type="number"
                  min="0"
                />
              </Field>
              <Field label="Down Payment %" error={errors.downPaymentPercent}>
                <Input
                  value={form.downPaymentPercent}
                  onChange={set("downPaymentPercent")}
                  placeholder="20"
                  type="number"
                  min="0"
                  max="100"
                />
              </Field>
              <Field label="Loan Type">
                <Select
                  value={form.loanType}
                  onValueChange={(v) => setForm((f) => ({ ...f, loanType: v as LoanType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOAN_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            {/* Addendums */}
            <motion.div variants={cardItemVariants} className="space-y-4">
              <div className="flex items-center gap-3">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">Contract Addendums</p>
                <div className="flex-1 h-px bg-neutral-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ADDENDUM_LIST.map(({ key, label }) => (
                  <motion.label
                    key={key}
                    whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                    className="flex items-start gap-3 rounded-lg border border-transparent p-2 -m-2 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      id={key}
                      checked={form.addendums[key as keyof typeof defaultAddendums]}
                      onCheckedChange={(checked) =>
                        setForm((f) => ({
                          ...f,
                          addendums: { ...f.addendums, [key]: !!checked },
                        }))
                      }
                      className="mt-0.5"
                    />
                    <span className="text-sm text-neutral-700 leading-snug">{label}</span>
                  </motion.label>
                ))}
              </div>
            </motion.div>

            {/* Special Requests */}
            <motion.div variants={cardItemVariants} className="space-y-1.5">
              <Label>Special Requests <span className="text-neutral-400 normal-case font-normal tracking-normal">(optional)</span></Label>
              <Textarea
                value={form.specialRequests}
                onChange={set("specialRequests")}
                placeholder="Any special terms, conditions, or requests to include in the contract..."
                rows={3}
              />
            </motion.div>
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="mt-6"
          >
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Contract
                </>
              )}
            </Button>
            <p className="text-center text-xs text-neutral-400 mt-3">
              Contract will be drafted by Claude AI and reviewed before sending
            </p>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
