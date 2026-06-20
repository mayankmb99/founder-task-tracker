"use client";

import { CompanyProfile } from "@/lib/types";
import { FieldInput, ListFieldInput } from "./FieldInput";

interface CompanyProfileFormProps {
  profile: CompanyProfile;
  onChange: (profile: CompanyProfile) => void;
}

export default function CompanyProfileForm({
  profile,
  onChange,
}: CompanyProfileFormProps) {
  function set<K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) {
    onChange({ ...profile, [key]: value });
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <FieldInput
        label="Company name"
        value={profile.companyName}
        onChange={(v) => set("companyName", v)}
      />
      <FieldInput
        label="Company description"
        value={profile.companyDescription}
        onChange={(v) => set("companyDescription", v)}
        multiline
      />
      <FieldInput
        label="Product or service"
        value={profile.productOrService}
        onChange={(v) => set("productOrService", v)}
        multiline
      />
      <FieldInput
        label="Problem solved"
        value={profile.problemSolved}
        onChange={(v) => set("problemSolved", v)}
        multiline
      />
      <FieldInput
        label="Value proposition"
        value={profile.valueProposition}
        onChange={(v) => set("valueProposition", v)}
        multiline
      />
      <ListFieldInput
        label="Differentiation"
        helperText="One item per line"
        values={profile.differentiation}
        onChange={(v) => set("differentiation", v)}
      />
      <ListFieldInput
        label="Traction"
        helperText="One item per line"
        values={profile.traction}
        onChange={(v) => set("traction", v)}
      />
      <ListFieldInput
        label="Customers"
        helperText="One item per line"
        values={profile.customers}
        onChange={(v) => set("customers", v)}
      />
      <ListFieldInput
        label="Proof points"
        helperText="One item per line"
        values={profile.proofPoints}
        onChange={(v) => set("proofPoints", v)}
      />
      <ListFieldInput
        label="Case studies"
        helperText="One item per line"
        values={profile.caseStudies}
        onChange={(v) => set("caseStudies", v)}
      />
    </div>
  );
}
