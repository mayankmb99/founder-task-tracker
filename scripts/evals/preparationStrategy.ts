import { supabaseServer, DEMO_USER_ID } from "@/lib/supabaseServer";
import { loadAdversarialFixtures, loadPreparationStrategyFixtures } from "./loadFixtures";
import { assert, compactObject, fetchJson, resolveBaseUrl } from "./shared";
import { judgeCase } from "./judge";
import type { AudienceSegment, CompanyProfile, EventRecord, FounderProfile } from "@/lib/types";

type PreparationFixtureInput = {
  founder_profile: FounderProfile;
  company_profile: CompanyProfile;
  audience_segment?: AudienceSegment | null;
  event: EventRecord;
};

type PreparationEvalFixture = {
  id: string;
  description: string;
  expected_interaction_type: string;
  expected_structured_fields: Record<string, unknown>;
  input: PreparationFixtureInput;
};

type EventRouteResponse = {
  event?: EventRecord;
};

type StrategyRouteResponse = {
  result?: {
    confidence?: number;
  };
  persisted?: boolean;
};

type BootstrapResponse = {
  strategiesByEvent?: Record<string, unknown>;
};

async function cleanupEventArtifacts(eventId: string) {
  await supabaseServer.from("event_strategies").delete().eq("user_id", DEMO_USER_ID).eq("event_id", eventId);
  await supabaseServer.from("event_targets").delete().eq("user_id", DEMO_USER_ID).eq("event_id", eventId);
  await supabaseServer.from("events").delete().eq("user_id", DEMO_USER_ID).eq("id", eventId);
}

async function runCase(baseUrl: string, fixtureId: string, fixtures: PreparationEvalFixture[], includeJudge = false) {
  const fixture = fixtures.find((item) => item.id === fixtureId);
  assert(fixture, `Missing fixture ${fixtureId}`);
  const input = fixture.input as PreparationFixtureInput;

  const createEvent = await fetchJson(`${baseUrl}/api/events`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event: input.event }),
  });
  console.log(JSON.stringify({ caseId: fixtureId, step: "create-event", status: createEvent.status, response: createEvent.body }, null, 2));
  if (createEvent.status !== 200) {
    await cleanupEventArtifacts((createEvent.body as EventRouteResponse).event?.id ?? "");
    console.log(`FAIL ${fixtureId}: event creation failed`);
    return;
  }
  const createdEvent = (createEvent.body as EventRouteResponse).event;
  if (!createdEvent) {
    console.log(`FAIL ${fixtureId}: event creation response missing event.`);
    return;
  }

  try {
    const bootstrapBefore = await fetchJson(`${baseUrl}/api/bootstrap`);
    if (bootstrapBefore.status !== 200) {
      console.log(`FAIL ${fixtureId}: bootstrap before generation failed`);
      return;
    }

    const strategy = await fetchJson(`${baseUrl}/api/generate-event-strategy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        compactObject({
          founderProfile: input.founder_profile,
          companyProfile: input.company_profile,
          audienceSegment: input.audience_segment ?? null,
          event: createdEvent,
        })
      ),
    });
    console.log(JSON.stringify({ caseId: fixtureId, step: "generate-strategy", status: strategy.status, response: strategy.body }, null, 2));
    const strategyBody = strategy.body as StrategyRouteResponse;
    if (strategy.status === 200) {
      const bootstrapAfter = await fetchJson(`${baseUrl}/api/bootstrap`);
      if (bootstrapAfter.status === 200) {
        const bootstrapAfterBody = bootstrapAfter.body as BootstrapResponse;
        console.log(
          JSON.stringify(
            {
              caseId: fixtureId,
              persisted: Boolean(bootstrapAfterBody.strategiesByEvent?.[createdEvent.id]),
              eventId: createdEvent.id,
              strategyConfidence: strategyBody.result?.confidence ?? null,
            },
            null,
            2
          )
        );
      } else {
        console.log(`FAIL ${fixtureId}: bootstrap after generation failed`);
      }

      if (includeJudge) {
        const judge = await judgeCase({
          workflow: fixture.expected_interaction_type,
          description: fixture.description,
          expected: JSON.stringify(fixture.expected_structured_fields),
          actual: JSON.stringify(strategyBody.result ?? {}),
        });
        console.log(JSON.stringify({ caseId: fixtureId, step: "judge", judge }, null, 2));
      }
    } else {
      console.log(`FAIL ${fixtureId}: strategy generation returned ${strategy.status}`);
    }
  } finally {
    await cleanupEventArtifacts(createdEvent.id);
  }
}

async function main() {
  const baseUrl = resolveBaseUrl();
  const [prepFixtures, adversarialFixtures] = await Promise.all([
    loadPreparationStrategyFixtures(),
    loadAdversarialFixtures(),
  ]);
  const fixtures = [...prepFixtures, ...adversarialFixtures] as PreparationEvalFixture[];
  const fixtureIds = ["ps-01", "ps-05", "ps-04", "ps-11", "adv-04"];
  for (const [index, fixtureId] of fixtureIds.entries()) {
    await runCase(baseUrl, fixtureId, fixtures, index === 0 || fixtureId === "adv-04");
  }
  console.log("Preparation strategy eval completed and temporary records were cleaned up.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
