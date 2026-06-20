import {
  AudienceSegment,
  CompanyProfile,
  EventRecord,
  FounderProfile,
  Settings,
  Suggestion,
  Task,
} from "./types";

// Reference "today" used to build relative sample dates.
// Fixed at noon UTC and offset using UTC date math so the resulting
// YYYY-MM-DD is identical regardless of the server's or browser's timezone.
const TODAY_UTC = Date.UTC(2026, 5, 20, 12);

function dateOffset(days: number): string {
  const d = new Date(TODAY_UTC);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Send investor update email",
    source: "Gmail",
    dueDate: dateOffset(0),
    dueTime: "10:00",
    reminderMinutes: 15,
    status: "pending",
  },
  {
    id: "t2",
    title: "Call back supplier re: invoice",
    source: "WhatsApp",
    dueDate: dateOffset(0),
    dueTime: "14:30",
    reminderMinutes: 10,
    status: "pending",
  },
  {
    id: "t3",
    title: "Board sync meeting",
    source: "Calendar",
    dueDate: dateOffset(0),
    dueTime: "17:00",
    reminderMinutes: 30,
    status: "pending",
  },
  {
    id: "t4",
    title: "Review product roadmap doc",
    source: "Gmail",
    dueDate: dateOffset(2),
    dueTime: "09:00",
    reminderMinutes: 15,
    status: "pending",
  },
  {
    id: "t5",
    title: "Confirm office lease renewal",
    source: "WhatsApp",
    dueDate: dateOffset(3),
    dueTime: "11:00",
    reminderMinutes: 5,
    status: "pending",
  },
  {
    id: "t6",
    title: "Quarterly tax filing reminder",
    source: "Calendar",
    dueDate: dateOffset(5),
    dueTime: "16:00",
    reminderMinutes: 30,
    status: "pending",
  },
  {
    id: "t7",
    title: "Send onboarding docs to new hire",
    source: "Gmail",
    dueDate: dateOffset(-1),
    dueTime: "09:30",
    reminderMinutes: 10,
    status: "completed",
  },
  {
    id: "t8",
    title: "Pay co-working space invoice",
    source: "WhatsApp",
    dueDate: dateOffset(-2),
    dueTime: "13:00",
    reminderMinutes: 5,
    status: "completed",
  },
];

export const initialSuggestions: Suggestion[] = [
  {
    id: "s1",
    originalMessage:
      "Hey, can you send over the signed NDA before our call tomorrow morning?",
    extractedTitle: "Send signed NDA",
    taskOwner: "You",
    date: dateOffset(1),
    time: "09:00",
    source: "WhatsApp",
    confidence: 92,
  },
  {
    id: "s2",
    originalMessage:
      "Reminder: Q3 budget review is scheduled, please prepare the slide deck beforehand.",
    extractedTitle: "Prepare Q3 budget slide deck",
    taskOwner: "You",
    date: dateOffset(4),
    time: "15:00",
    source: "Gmail",
    confidence: 87,
  },
  {
    id: "s3",
    originalMessage:
      "Don't forget — dentist appointment moved to next Tuesday at 4pm.",
    extractedTitle: "Dentist appointment",
    taskOwner: "You",
    date: dateOffset(6),
    time: "16:00",
    source: "Calendar",
    confidence: 78,
  },
  {
    id: "s4",
    originalMessage:
      "Can we sync on the marketing budget sometime this week? It's getting urgent.",
    extractedTitle: "Sync on marketing budget",
    taskOwner: "You",
    date: dateOffset(2),
    time: "11:30",
    source: "WhatsApp",
    confidence: 65,
  },
];

export const initialSettings: Settings = {
  notificationsEnabled: true,
  defaultReminderMinutes: 15,
};

// ---------------------------------------------------------------------
// Founder Event Copilot — demo data (one polished Startup Expo scenario)
// ---------------------------------------------------------------------

export const initialFounderProfile: FounderProfile = {
  founderName: "Priya Nair",
  role: "Co-founder & CEO",
  professionalSummary:
    "Former data infrastructure engineering lead who spent 6 years building large-scale logistics systems before starting RouteIQ. Led a 12-person platform team and shipped systems handling millions of daily events.",
  relevantExperience: [
    "6 years as a senior/lead engineer building logistics and routing infrastructure",
    "Shipped and scaled a real-time event-processing platform used by 3 enterprise clients",
    "First-time founder, 2 years building RouteIQ",
  ],
  strengths: [
    "Deep technical credibility on data infrastructure and routing optimization",
    "Plain-spoken, no-hype communication style that resonates with technical buyers",
    "Strong at translating engineering tradeoffs into business outcomes",
  ],
  achievements: [
    "Built and scaled a routing engine processing 50M+ events/day at previous company",
    "Raised a $1.2M pre-seed round for RouteIQ",
    "Grew RouteIQ to 14 paying logistics customers in 18 months",
  ],
  communicationStyle:
    "Direct and substance-first. Prefers concrete numbers and concise technical detail over broad claims. Comfortable with technical audiences; keeps pitches short for time-constrained conversations.",
};

export const initialCompanyProfile: CompanyProfile = {
  companyName: "RouteIQ",
  companyDescription:
    "RouteIQ is a route optimization and live dispatch platform for mid-size logistics and last-mile delivery companies.",
  productOrService:
    "A SaaS platform that re-optimizes delivery routes in real time as conditions change (traffic, cancellations, new orders), with a dispatcher dashboard and driver mobile app.",
  problemSolved:
    "Mid-size delivery fleets plan routes once in the morning and can't adapt when real-world conditions change, leading to late deliveries and wasted driver time.",
  valueProposition:
    "RouteIQ cuts missed delivery windows and idle driver time by continuously re-optimizing routes throughout the day, not just once each morning.",
  differentiation: [
    "Re-optimizes routes live throughout the day, unlike most route planners that only plan once",
    "Built by engineers with direct large-scale routing infrastructure experience, not a generic mapping API wrapper",
    "Integrates directly with existing dispatch workflows instead of requiring a full platform switch",
  ],
  traction: [
    "14 paying logistics customers",
    "$1.2M pre-seed raised",
    "Average customer sees measurable on-time delivery improvement within first month (per case studies)",
  ],
  customers: [
    "Meridian Logistics (regional last-mile delivery fleet)",
    "CrateWorks (e-commerce fulfillment and delivery)",
    "Northwind Freight (regional freight and parcel delivery)",
  ],
  proofPoints: [
    "Meridian Logistics reduced missed delivery windows by 22% in the first 60 days",
    "CrateWorks cut average driver idle time by 15 minutes per shift",
    "14 paying customers retained over 18 months with no churn to date",
  ],
  caseStudies: [
    "Meridian Logistics case study: 22% fewer missed delivery windows after switching from static morning route planning to RouteIQ's live re-optimization",
    "CrateWorks case study: drivers saved ~15 minutes of idle time per shift during peak season",
  ],
};

export const initialAudienceSegments: AudienceSegment[] = [
  {
    id: "aud1",
    name: "Mid-size logistics & last-mile delivery operators",
    roles: [
      "VP of Operations",
      "Head of Logistics",
      "Dispatch Manager",
      "Founder/COO at smaller delivery companies",
    ],
    companyTypes: [
      "Regional last-mile delivery fleets",
      "E-commerce fulfillment & delivery operators",
      "Regional freight and parcel companies",
    ],
    problems: [
      "Routes planned once each morning become outdated as conditions change",
      "Missed delivery windows hurting customer satisfaction and contracts",
      "Drivers sitting idle or rerouted manually by dispatchers under time pressure",
    ],
    needs: [
      "A way to adapt routes in real time without replacing their whole dispatch workflow",
      "Clear, measurable improvement in on-time delivery rates",
      "Confidence the platform can integrate with what they already use",
    ],
    objections: [
      "\"We already have a route planning tool\"",
      "\"Switching platforms sounds disruptive for our dispatch team\"",
      "\"Is this proven at our scale, not just for huge enterprises?\"",
    ],
    desiredOutcomes: [
      "Fewer missed delivery windows",
      "Less wasted driver time",
      "A low-friction pilot they can evaluate without a full platform migration",
    ],
  },
];

export const initialEvents: EventRecord[] = [
  {
    id: "ev1",
    eventType: "startup_expo",
    eventName: "Metro Startup Expo 2026",
    eventDescription:
      "A regional startup expo with an exhibitor floor and a logistics & supply-chain track, attended by founders, operators, and a handful of investors focused on operations tech.",
    eventStart: dateOffset(5),
    eventLocation: "Bengaluru International Exhibition Centre",
    userGoal:
      "Get 3-5 qualified conversations with mid-size logistics operators who could become pilot customers, and identify at least one investor conversation worth a follow-up.",
    additionalContext:
      "RouteIQ has a small exhibitor table (not a speaking slot). Priya will be there alone for most of the day. Time per conversation is likely short (5-10 minutes) given expo foot traffic.",
    audienceSegmentId: "aud1",
    targets: [
      {
        id: "tg1",
        personName: "Karthik Subramaniam",
        role: "VP of Operations",
        companyName: "Swiftline Deliveries",
        companyDescription:
          "A regional last-mile delivery company operating across South India, similar size to RouteIQ's existing customers.",
        knownNeeds: [
          "Known to be expanding delivery zones this quarter",
          "Publicly mentioned missed-delivery-window complaints as a current pain point at a panel last year",
        ],
        relevanceReason:
          "Operates at the same scale and same core problem (missed delivery windows) as RouteIQ's strongest existing case study (Meridian Logistics), making the pitch directly applicable.",
        priority: "high",
        status: "not_contacted",
      },
      {
        id: "tg2",
        personName: "Anjali Ferreira",
        role: "Founder & COO",
        companyName: "CrateLoop",
        companyDescription:
          "An early-stage e-commerce fulfillment startup, smaller than RouteIQ's typical customer profile.",
        knownNeeds: [
          "Building out dispatch operations for the first time as they scale",
        ],
        relevanceReason:
          "Earlier-stage than RouteIQ's current customers, but fits the target audience profile and could be a forward-looking design partner rather than an immediate large contract.",
        priority: "medium",
        status: "not_contacted",
      },
      {
        id: "tg3",
        personName: "Devesh Rao",
        role: "Partner",
        companyName: "Northbridge Ventures",
        companyDescription:
          "An early-stage venture fund with a stated focus on operations and supply-chain technology, attending the expo's investor track.",
        knownNeeds: [],
        relevanceReason:
          "Listed as attending the expo's investor track with a public focus on operations/supply-chain tech, which matches RouteIQ's category — but no direct knowledge yet of his specific investment thesis or check size.",
        priority: "medium",
        status: "not_contacted",
      },
    ],
  },
];
