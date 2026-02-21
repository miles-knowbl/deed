"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useContractStore } from "@/store/contract";

const SECTIONS = [
  "Parties & Identification",
  "Property Description",
  "Purchase Price & Terms",
  "Financing Details",
  "Closing & Possession",
  "Condition of Property",
  "Inclusions & Exclusions",
  "Title & Transfer",
  "Default & Remedies",
  "Addendums & Special Terms",
  "Signatures & Execution",
];

export default function GeneratingView() {
  const router = useRouter();
  const { formData, appendContractText, setContractText } = useContractStore();
  const [displayedText, setDisplayedText] = useState("");
  const [currentSection, setCurrentSection] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const textRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!formData) {
      router.push("/");
      return;
    }

    let cancelled = false;

    async function generate() {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!res.ok || !res.body) {
          throw new Error("Generation failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let totalChars = 0;

        while (!cancelled) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;

          const chunk = decoder.decode(value, { stream: true });
          textRef.current += chunk;
          totalChars += chunk.length;

          setDisplayedText(textRef.current);
          appendContractText(chunk);

          // Progress: count ## section headers written so far
          const sectionsSeen = (textRef.current.match(/^## /gm) || []).length;
          const charFraction = Math.min(totalChars / 1000, 1) * 0.08; // 0–8% while first section loads
          const sectionFraction = (sectionsSeen / SECTIONS.length) * 0.97;
          const pct = Math.round(Math.max(charFraction, sectionFraction) * 100);
          setProgress(pct);

          // Section label: which section are we currently writing?
          const sectionIdx = Math.min(Math.max(sectionsSeen, 0), SECTIONS.length - 1);
          setCurrentSection(sectionIdx);

          // Auto-scroll
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }

        if (!cancelled) {
          setProgress(100);
          setContractText(textRef.current);
          setDone(true);

          // Brief pause then navigate
          await new Promise((r) => setTimeout(r, 1200));
          if (!cancelled) router.push("/review");
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          toast.error("Failed to generate contract. Please try again.", {
            action: { label: "Go back", onClick: () => router.push("/") },
          });
        }
      }
    }

    generate();
    return () => { cancelled = true; };
  }, [formData, appendContractText, setContractText, router]);

  return (
    <div className="min-h-screen bg-[#f9f8f7] flex flex-col">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-neutral-900">deed</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 flex-1 flex flex-col w-full">
        {/* Status */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {!done && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-2 h-2 rounded-full bg-neutral-900"
                />
              )}
              {done && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 rounded-full bg-neutral-900"
                />
              )}
              <AnimatePresence mode="wait">
                <motion.p
                  key={done ? "done" : currentSection}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-medium text-neutral-700"
                >
                  {done
                    ? "Contract complete — opening for review..."
                    : `Writing ${SECTIONS[currentSection]}...`}
                </motion.p>
              </AnimatePresence>
            </div>
            <span className="text-sm text-neutral-400 tabular-nums">{progress}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-neutral-900 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </motion.div>

        {/* Contract paper */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex-1 bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden"
        >
          <div className="border-b border-neutral-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
              <span className="ml-3 text-xs text-neutral-400 font-medium">
                Residential Purchase Agreement — {formData?.propertyAddress ?? ""}
              </span>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="h-[calc(100dvh-240px)] md:h-[calc(100dvh-320px)] overflow-y-auto px-4 sm:px-8 py-6"
          >
            <div className="prose-contract">
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
                {displayedText}
              </ReactMarkdown>
            </div>
            {!done && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-0.5 h-3.5 bg-neutral-900 ml-0.5 align-text-bottom"
              />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
