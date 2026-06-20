"use client";

import { AudienceSegment } from "@/lib/types";
import { FieldInput, ListFieldInput } from "./FieldInput";

interface AudienceSegmentsSectionProps {
  segments: AudienceSegment[];
  onChange: (segments: AudienceSegment[]) => void;
}

export default function AudienceSegmentsSection({
  segments,
  onChange,
}: AudienceSegmentsSectionProps) {
  function updateSegment(id: string, updated: AudienceSegment) {
    onChange(segments.map((s) => (s.id === id ? updated : s)));
  }

  function deleteSegment(id: string) {
    onChange(segments.filter((s) => s.id !== id));
  }

  function addSegment() {
    onChange([
      ...segments,
      {
        id: `aud-${Date.now()}`,
        name: "New audience segment",
        roles: [],
        companyTypes: [],
        problems: [],
        needs: [],
        objections: [],
        desiredOutcomes: [],
      },
    ]);
  }

  return (
    <div className="space-y-4">
      {segments.map((segment) => (
        <div
          key={segment.id}
          className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <FieldInput
                label="Audience name"
                value={segment.name}
                onChange={(v) => updateSegment(segment.id, { ...segment, name: v })}
              />
            </div>
            <button
              onClick={() => deleteSegment(segment.id)}
              className="mt-5 rounded-lg px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
          <ListFieldInput
            label="Roles"
            helperText="One per line"
            values={segment.roles}
            onChange={(v) => updateSegment(segment.id, { ...segment, roles: v })}
          />
          <ListFieldInput
            label="Company types"
            helperText="One per line"
            values={segment.companyTypes}
            onChange={(v) =>
              updateSegment(segment.id, { ...segment, companyTypes: v })
            }
          />
          <ListFieldInput
            label="Problems"
            helperText="One per line"
            values={segment.problems}
            onChange={(v) => updateSegment(segment.id, { ...segment, problems: v })}
          />
          <ListFieldInput
            label="Needs"
            helperText="One per line"
            values={segment.needs}
            onChange={(v) => updateSegment(segment.id, { ...segment, needs: v })}
          />
          <ListFieldInput
            label="Objections"
            helperText="One per line"
            values={segment.objections}
            onChange={(v) =>
              updateSegment(segment.id, { ...segment, objections: v })
            }
          />
          <ListFieldInput
            label="Desired outcomes"
            helperText="One per line"
            values={segment.desiredOutcomes}
            onChange={(v) =>
              updateSegment(segment.id, { ...segment, desiredOutcomes: v })
            }
          />
        </div>
      ))}

      <button
        onClick={addSegment}
        className="w-full rounded-xl border border-dashed border-gray-300 bg-white/40 py-3 text-sm font-medium text-gray-500 hover:bg-white"
      >
        + Add audience segment
      </button>
    </div>
  );
}
