"use client";

import { FounderProfile } from "@/lib/types";
import { FieldInput, ListFieldInput } from "./FieldInput";

interface FounderProfileFormProps {
  profile: FounderProfile;
  onChange: (profile: FounderProfile) => void;
}

export default function FounderProfileForm({
  profile,
  onChange,
}: FounderProfileFormProps) {
  function set<K extends keyof FounderProfile>(key: K, value: FounderProfile[K]) {
    onChange({ ...profile, [key]: value });
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-2 gap-4">
        <FieldInput
          label="Founder name"
          value={profile.founderName}
          onChange={(v) => set("founderName", v)}
        />
        <FieldInput
          label="Role"
          value={profile.role}
          onChange={(v) => set("role", v)}
        />
      </div>
      <FieldInput
        label="Professional summary"
        value={profile.professionalSummary}
        onChange={(v) => set("professionalSummary", v)}
        multiline
      />
      <ListFieldInput
        label="Relevant experience"
        helperText="One item per line"
        values={profile.relevantExperience}
        onChange={(v) => set("relevantExperience", v)}
      />
      <ListFieldInput
        label="Strengths"
        helperText="One item per line"
        values={profile.strengths}
        onChange={(v) => set("strengths", v)}
      />
      <ListFieldInput
        label="Achievements / credibility"
        helperText="One item per line"
        values={profile.achievements}
        onChange={(v) => set("achievements", v)}
      />
      <FieldInput
        label="Preferred communication style"
        value={profile.communicationStyle}
        onChange={(v) => set("communicationStyle", v)}
        multiline
      />
    </div>
  );
}
