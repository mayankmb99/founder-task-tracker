import {
  AudienceSegment,
  CompanyProfile,
  EventRecord,
  EventStrategy,
  EventTarget,
  FounderProfile,
  PersonToPrioritise,
  Settings,
  Task,
  TaskSource,
} from "./types";

const SOURCE_TO_DB: Record<TaskSource, string> = {
  Gmail: "gmail",
  WhatsApp: "whatsapp",
  Calendar: "calendar",
  Manual: "manual",
};
const SOURCE_FROM_DB: Record<string, TaskSource> = {
  gmail: "Gmail",
  whatsapp: "WhatsApp",
  calendar: "Calendar",
  manual: "Manual",
};

export function taskSourceToDb(source: TaskSource): string {
  return SOURCE_TO_DB[source];
}

export function taskFromDb(row: {
  id: string;
  title: string;
  source: string;
  due_date: string | null;
  due_time: string | null;
  reminder_minutes: number;
  status: string;
}): Task {
  return {
    id: row.id,
    title: row.title,
    source: SOURCE_FROM_DB[row.source] ?? "Manual",
    dueDate: row.due_date ?? "",
    dueTime: (row.due_time ?? "00:00").slice(0, 5),
    reminderMinutes: row.reminder_minutes,
    status: row.status === "completed" ? "completed" : "pending",
  };
}

export function settingsFromDb(row: {
  notifications_enabled: boolean;
  default_reminder_minutes: number;
}): Settings {
  return {
    notificationsEnabled: row.notifications_enabled,
    defaultReminderMinutes: row.default_reminder_minutes as 5 | 10 | 15 | 30,
  };
}

export function founderProfileFromDb(row: {
  founder_name: string | null;
  role: string | null;
  professional_summary: string | null;
  relevant_experience: string[] | null;
  strengths: string[] | null;
  achievements: string[] | null;
  communication_style: string | null;
}): FounderProfile {
  return {
    founderName: row.founder_name ?? "",
    role: row.role ?? "",
    professionalSummary: row.professional_summary ?? "",
    relevantExperience: row.relevant_experience ?? [],
    strengths: row.strengths ?? [],
    achievements: row.achievements ?? [],
    communicationStyle: row.communication_style ?? "",
  };
}

export function companyProfileFromDb(row: {
  company_name: string | null;
  company_description: string | null;
  product_or_service: string | null;
  problem_solved: string | null;
  value_proposition: string | null;
  differentiation: string[] | null;
  traction: string[] | null;
  customers: string[] | null;
  proof_points: string[] | null;
  case_studies: string[] | null;
}): CompanyProfile {
  return {
    companyName: row.company_name ?? "",
    companyDescription: row.company_description ?? "",
    productOrService: row.product_or_service ?? "",
    problemSolved: row.problem_solved ?? "",
    valueProposition: row.value_proposition ?? "",
    differentiation: row.differentiation ?? [],
    traction: row.traction ?? [],
    customers: row.customers ?? [],
    proofPoints: row.proof_points ?? [],
    caseStudies: row.case_studies ?? [],
  };
}

export function audienceSegmentFromDb(row: {
  id: string;
  name: string;
  roles: string[] | null;
  company_types: string[] | null;
  problems: string[] | null;
  needs: string[] | null;
  objections: string[] | null;
  desired_outcomes: string[] | null;
}): AudienceSegment {
  return {
    id: row.id,
    name: row.name,
    roles: row.roles ?? [],
    companyTypes: row.company_types ?? [],
    problems: row.problems ?? [],
    needs: row.needs ?? [],
    objections: row.objections ?? [],
    desiredOutcomes: row.desired_outcomes ?? [],
  };
}

export function eventTargetFromDb(row: {
  id: string;
  person_name: string | null;
  role: string | null;
  company_name: string | null;
  company_description: string | null;
  known_needs: string[] | null;
  relevance_reason: string | null;
  priority: string | null;
  status: string | null;
}): EventTarget {
  return {
    id: row.id,
    personName: row.person_name ?? "",
    role: row.role ?? "",
    companyName: row.company_name ?? "",
    companyDescription: row.company_description ?? "",
    knownNeeds: row.known_needs ?? [],
    relevanceReason: row.relevance_reason ?? "",
    priority: (row.priority as EventTarget["priority"]) ?? "medium",
    status: (row.status as EventTarget["status"]) ?? "not_contacted",
  };
}

export function eventFromDb(
  row: {
    id: string;
    event_type: string;
    event_name: string;
    event_description: string | null;
    event_start: string | null;
    event_location: string | null;
    user_goal: string | null;
    additional_context: string | null;
  },
  targets: EventTarget[],
  audienceSegmentId: string | null
): EventRecord {
  return {
    id: row.id,
    eventType: row.event_type as EventRecord["eventType"],
    eventName: row.event_name,
    eventDescription: row.event_description ?? "",
    eventStart: row.event_start ? row.event_start.slice(0, 10) : "",
    eventLocation: row.event_location ?? "",
    userGoal: row.user_goal ?? "",
    additionalContext: row.additional_context ?? "",
    audienceSegmentId,
    targets,
  };
}

export function eventStrategyFromDb(row: {
  positioning_summary: string | null;
  founder_introduction: string | null;
  company_pitch: string | null;
  people_to_prioritise: Array<{
    person_name: string;
    reason: string;
    pitch_angle: string;
  }> | null;
  proof_points_to_use: string[] | null;
  questions_to_ask: string[] | null;
  talking_points: string[] | null;
  conversation_goals: string[] | null;
  preparation_items: string[] | null;
  follow_up_actions: string[] | null;
  risks: string[] | null;
  missing_information: string[] | null;
  confidence: number | null;
}): EventStrategy {
  const people: PersonToPrioritise[] = (row.people_to_prioritise ?? []).map(
    (p) => ({
      personName: p.person_name,
      reason: p.reason,
      pitchAngle: p.pitch_angle,
    })
  );
  return {
    positioningSummary: row.positioning_summary ?? "",
    founderIntroduction: row.founder_introduction ?? "",
    companyPitch: row.company_pitch ?? "",
    peopleToPrioritise: people,
    proofPointsToUse: row.proof_points_to_use ?? [],
    questionsToAsk: row.questions_to_ask ?? [],
    talkingPoints: row.talking_points ?? [],
    conversationGoals: row.conversation_goals ?? [],
    preparationItems: row.preparation_items ?? [],
    followUpActions: row.follow_up_actions ?? [],
    risks: row.risks ?? [],
    missingInformation: row.missing_information ?? [],
    confidence: row.confidence ?? 0,
  };
}
