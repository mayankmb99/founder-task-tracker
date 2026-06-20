export type TaskSource = "Gmail" | "WhatsApp" | "Calendar" | "Manual";

export type TaskStatus = "pending" | "completed";

export interface Task {
  id: string;
  title: string;
  source: TaskSource;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM
  reminderMinutes: number;
  status: TaskStatus;
}

export interface Suggestion {
  id: string;
  originalMessage: string;
  extractedTitle: string;
  taskOwner: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  source: TaskSource;
  confidence: number; // 0-100
}

export interface Settings {
  notificationsEnabled: boolean;
  defaultReminderMinutes: 5 | 10 | 15 | 30;
}

// ---------------------------------------------------------------------
// Founder Event Copilot
// ---------------------------------------------------------------------

export interface FounderProfile {
  founderName: string;
  role: string;
  professionalSummary: string;
  relevantExperience: string[];
  strengths: string[];
  achievements: string[];
  communicationStyle: string;
}

export interface CompanyProfile {
  companyName: string;
  companyDescription: string;
  productOrService: string;
  problemSolved: string;
  valueProposition: string;
  differentiation: string[];
  traction: string[];
  customers: string[];
  proofPoints: string[];
  caseStudies: string[];
}

export interface AudienceSegment {
  id: string;
  name: string;
  roles: string[];
  companyTypes: string[];
  problems: string[];
  needs: string[];
  objections: string[];
  desiredOutcomes: string[];
}

export type EventTargetPriority = "high" | "medium" | "low";
export type EventTargetStatus = "not_contacted" | "contacted" | "met";

export interface EventTarget {
  id: string;
  personName: string;
  role: string;
  companyName: string;
  companyDescription: string;
  knownNeeds: string[];
  relevanceReason: string;
  priority: EventTargetPriority;
  status: EventTargetStatus;
}

// Only "startup_expo" is fully implemented for this hackathon. The
// other values describe the same architecture's intended future scope.
export type EventType =
  | "startup_expo"
  | "sales_meeting"
  | "investor_meeting"
  | "partnership_meeting"
  | "conference"
  | "vendor_negotiation"
  | "hackathon";

export interface EventRecord {
  id: string;
  eventType: EventType;
  eventName: string;
  eventDescription: string;
  eventStart: string; // ISO date, YYYY-MM-DD
  eventLocation: string;
  userGoal: string;
  additionalContext: string;
  audienceSegmentId: string | null;
  targets: EventTarget[];
}

export interface PersonToPrioritise {
  personName: string;
  reason: string;
  pitchAngle: string;
}

export interface EventStrategy {
  positioningSummary: string;
  founderIntroduction: string;
  companyPitch: string;
  peopleToPrioritise: PersonToPrioritise[];
  proofPointsToUse: string[];
  questionsToAsk: string[];
  talkingPoints: string[];
  conversationGoals: string[];
  preparationItems: string[];
  followUpActions: string[];
  risks: string[];
  missingInformation: string[];
  confidence: number;
}
