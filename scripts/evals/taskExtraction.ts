import { supabaseServer } from "@/lib/supabaseServer";
import { loadTaskExtractionFixtures } from "./loadFixtures";
import { assert, compactObject, fetchJson, resolveBaseUrl } from "./shared";

type TaskExtractionFixtureInput = {
  message: string;
  source?: string;
  reference_date?: string;
  timezone?: string;
  received_at?: string;
};

type TaskExtractionRouteResponse = {
  result?: {
    isActionItem?: boolean;
    taskTitle?: string | null;
    dueDate?: string | null;
    dueTime?: string | null;
    missingInformation?: string[];
  };
  suggestionId?: string;
};

type TaskRouteResponse = {
  task?: {
    id: string;
    title: string;
  };
};

type BootstrapResponse = {
  tasks?: Array<{ title: string }>;
};

type TempRecord = {
  suggestionId: string | null;
  taskId: string | null;
};

async function deleteSuggestion(id: string | null) {
  if (!id) return;
  await supabaseServer.from("task_suggestions").delete().eq("id", id);
}

async function deleteTask(id: string | null) {
  if (!id) return;
  await supabaseServer.from("tasks").delete().eq("id", id);
}

async function main() {
  const baseUrl = resolveBaseUrl();
  const fixtures = await loadTaskExtractionFixtures();
  const tempRecords: TempRecord[] = [];

  const cases = ["tx-01", "tx-03", "tx-04"].map((id) => {
    const fixture = fixtures.find((entry) => entry.id === id);
    assert(fixture, `Expected fixture ${id} to exist.`);
    return fixture as { id: string; input: TaskExtractionFixtureInput };
  });

  try {
    for (const fixture of cases) {
      const input = fixture.input;
      const response = await fetchJson(`${baseUrl}/api/extract-task`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          compactObject({
            message: input.message,
            sourceType: input.source ?? "manual",
            receivedAt: input.received_at ?? null,
            currentDate: input.reference_date ?? undefined,
            userTimezone: input.timezone ?? "Asia/Kolkata",
          })
        ),
      });

      console.log(
        JSON.stringify(
          {
            caseId: fixture!.id,
            status: response.status,
            response: response.body,
          },
          null,
          2
        )
      );

      assert(response.status === 200, `${fixture.id} extraction failed with ${response.status}`);
      const body = response.body as TaskExtractionRouteResponse;
      tempRecords.push({ suggestionId: body.suggestionId ?? null, taskId: null });

      if (fixture.id === "tx-01") {
        assert(body.result?.isActionItem === true, "tx-01 should be actionable.");
        const accept = await fetchJson(`${baseUrl}/api/task-suggestions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            suggestionId: body.suggestionId,
            task: {
              title: body.result.taskTitle,
              dueDate: body.result.dueDate,
              dueTime: body.result.dueTime,
              reminderMinutes: 5,
            },
          }),
        });
        console.log(JSON.stringify({ caseId: "tx-01-accept", status: accept.status, response: accept.body }, null, 2));
        assert(accept.status === 200, "tx-01 accept should succeed.");
        const acceptedTask = (accept.body as TaskRouteResponse).task;
        assert(acceptedTask, "Accepted task payload is missing.");
        tempRecords.push({ suggestionId: body.suggestionId ?? null, taskId: acceptedTask.id });

        const duplicate = await fetchJson(`${baseUrl}/api/task-suggestions`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            suggestionId: body.suggestionId,
            task: {
              title: body.result.taskTitle,
              dueDate: body.result.dueDate,
              dueTime: body.result.dueTime,
              reminderMinutes: 5,
            },
          }),
        });
        console.log(JSON.stringify({ caseId: "tx-01-duplicate", status: duplicate.status, response: duplicate.body }, null, 2));
        assert(duplicate.status === 409, "Duplicate acceptance should be blocked.");

        const bootstrap = await fetchJson(`${baseUrl}/api/bootstrap`);
        assert(bootstrap.status === 200, "Bootstrap should succeed after task acceptance.");
        const bootstrapBody = bootstrap.body as BootstrapResponse;
        const taskTitles = (bootstrapBody.tasks ?? []).map((task) => task.title);
        assert(taskTitles.includes(acceptedTask.title), "Accepted task should appear in bootstrap.");
      }

      if (fixture.id === "tx-03") {
        assert(body.result?.isActionItem === true, "tx-03 should be actionable.");
        assert(body.result?.dueTime === null || body.result?.missingInformation?.includes("dueTime"), "tx-03 should keep ambiguous time unresolved.");
      }

      if (fixture.id === "tx-04") {
        assert(body.result?.isActionItem === false, "tx-04 should not be actionable.");
        const dismiss = await fetchJson(`${baseUrl}/api/task-suggestions`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ suggestionId: body.suggestionId }),
        });
        console.log(JSON.stringify({ caseId: "tx-04-dismiss", status: dismiss.status, response: dismiss.body }, null, 2));
        assert(dismiss.status === 200, "Dismiss should succeed for tx-04.");
      }
    }
  } finally {
    const seenSuggestionIds = new Set<string>();
    const seenTaskIds = new Set<string>();
    for (const record of tempRecords.reverse()) {
      if (record.suggestionId && !seenSuggestionIds.has(record.suggestionId)) {
        seenSuggestionIds.add(record.suggestionId);
        await deleteSuggestion(record.suggestionId);
      }
      if (record.taskId && !seenTaskIds.has(record.taskId)) {
        seenTaskIds.add(record.taskId);
        await deleteTask(record.taskId);
      }
    }
  }

  console.log("Task extraction eval completed and temporary records were cleaned up.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
