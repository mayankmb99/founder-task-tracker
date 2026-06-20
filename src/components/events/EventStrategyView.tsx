"use client";

import { EventStrategy, EventTarget } from "@/lib/types";

interface EventStrategyViewProps {
  strategy: EventStrategy;
  targets: EventTarget[];
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-gray-800">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li
            key={i}
            className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm text-gray-600"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EventStrategyView({ strategy, targets }: EventStrategyViewProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-500">
          Preparation strategy
        </p>
        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
          {Math.round(strategy.confidence * 100)}% confidence
        </span>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-gray-800">
          Recommended positioning
        </p>
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {strategy.positioningSummary}
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-gray-800">
          Founder introduction
        </p>
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {strategy.founderIntroduction}
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-gray-800">
          Company pitch
        </p>
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {strategy.companyPitch}
        </p>
      </div>

      {strategy.peopleToPrioritise.length > 0 && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-gray-800">
            People to prioritise — and why
          </p>
          <ul className="space-y-2">
            {strategy.peopleToPrioritise.map((p, i) => (
              <li
                key={i}
                className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600"
              >
                <span className="font-medium text-gray-800">{p.personName}</span>
                {(() => {
                  const priority = targets.find(
                    (target) =>
                      p.personName
                        .toLocaleLowerCase()
                        .startsWith(target.personName.toLocaleLowerCase())
                  )?.priority;
                  return priority ? (
                    <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-purple-700">
                      {priority} priority
                    </span>
                  ) : null;
                })()}
                <span className="text-gray-400"> — </span>
                {p.reason}
                {p.pitchAngle && (
                  <p className="mt-1 text-xs text-gray-500">
                    <span className="font-medium text-gray-600">Pitch angle: </span>
                    {p.pitchAngle}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ListBlock title="Proof points to use" items={strategy.proofPointsToUse} />
      <ListBlock title="Questions to ask" items={strategy.questionsToAsk} />
      <ListBlock title="Talking points" items={strategy.talkingPoints} />
      <ListBlock title="Conversation goals" items={strategy.conversationGoals} />
      <ListBlock title="What to prepare" items={strategy.preparationItems} />
      <ListBlock title="Risks" items={strategy.risks} />
      <ListBlock title="Follow-up actions" items={strategy.followUpActions} />

      {strategy.missingInformation.length > 0 && (
        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
            Missing information (not invented by the AI)
          </p>
          <ul className="space-y-1">
            {strategy.missingInformation.map((item, i) => (
              <li key={i} className="text-sm text-amber-700">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
