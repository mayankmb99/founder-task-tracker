"use client";

import { useState } from "react";
import { AudienceSegment, CompanyProfile, FounderProfile } from "@/lib/types";
import FounderProfileForm from "./FounderProfileForm";
import CompanyProfileForm from "./CompanyProfileForm";
import AudienceSegmentsSection from "./AudienceSegmentsSection";

type Tab = "founder" | "company" | "audiences";

interface MyContextPageProps {
  founderProfile: FounderProfile;
  onFounderChange: (profile: FounderProfile) => void;
  companyProfile: CompanyProfile;
  onCompanyChange: (profile: CompanyProfile) => void;
  audienceSegments: AudienceSegment[];
  onAudienceChange: (segments: AudienceSegment[]) => void;
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "founder", label: "Founder Profile" },
  { key: "company", label: "Company Profile" },
  { key: "audiences", label: "Target Audiences" },
];

export default function MyContextPage({
  founderProfile,
  onFounderChange,
  companyProfile,
  onCompanyChange,
  audienceSegments,
  onAudienceChange,
}: MyContextPageProps) {
  const [tab, setTab] = useState<Tab>("founder");

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-lg bg-white/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "founder" && (
        <FounderProfileForm profile={founderProfile} onChange={onFounderChange} />
      )}
      {tab === "company" && (
        <CompanyProfileForm profile={companyProfile} onChange={onCompanyChange} />
      )}
      {tab === "audiences" && (
        <AudienceSegmentsSection
          segments={audienceSegments}
          onChange={onAudienceChange}
        />
      )}
    </div>
  );
}
