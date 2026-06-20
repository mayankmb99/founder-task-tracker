import type { EventType } from "@/lib/types";

export type TaskExtractionSourceType = "manual" | "gmail" | "whatsapp" | "calendar";

export interface TaskExtractionContext {
  sourceText: string;
  sourceType: TaskExtractionSourceType | null;
  receivedAt: string | null;
  currentDate: string;
  userTimezone: string;
  supportedTaskFields: string[];
  ambiguityRules: string[];
}

export interface PreparationTargetContext {
  personName: string;
  role: string;
  companyName: string;
  companyDescription: string;
  knownNeeds: string[];
  relevanceReason: string;
  priority: "high" | "medium" | "low";
  status: "not_contacted" | "contacted" | "met";
}

export interface RetrievalEvidence {
  id: string;
  title: string;
  excerpt: string;
  source: "structured" | "file_search";
}

export type RetrievalStatus = "not_configured" | "configured" | "no_results" | "results" | "failed";

export interface PreparationContext {
  currentDate: string;
  userTimezone: string;
  interactionType: EventType;
  interactionName: string;
  interactionDescription: string;
  interactionStart: string;
  interactionLocation: string;
  desiredOutcome: string;
  additionalContext: string;
  founderFacts: string[];
  companyFacts: string[];
  audienceFacts: string[];
  targets: PreparationTargetContext[];
  confirmedFacts: string[];
  userSuppliedInformation: string[];
  missingInformation: string[];
  generationObjective: string;
  sourceTaskContext: string[];
  retrievalStatus: RetrievalStatus;
  retrievalEvidence: RetrievalEvidence[];
}
