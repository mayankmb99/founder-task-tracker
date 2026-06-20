# Judge Q&A

Q: What AI models are active?

A: The app uses configurable routing. During this pass, live requests resolved to `gpt-5-mini-2025-08-07` through the configured fallback path.

Q: What API is used?

A: OpenAI Responses API with strict Structured Outputs.

Q: How do you prevent hallucinations?

A: Conservative prompt contracts, structured context builders, grounding validation, suspicious-claim checks, and human approval before creating tasks.

Q: Does the app change the database schema?

A: No. The database was frozen. No tables, columns, migrations, enums, constraints, indexes, or functions were added.

Q: Is document retrieval active?

A: Not by default. It only activates when `OPENAI_VECTOR_STORE_ID` is configured.

Q: How are tasks linked to meetings?

A: They are not permanently linked, because the frozen schema does not provide a supported relationship field.

Q: What if the AI returns bad output?

A: The app rejects malformed or suspicious output, preserves user input, and surfaces a retryable error.

Q: What should I check in the demo?

A: Readable task cards, approval/edit/dismiss, persistence after refresh, grounded strategy output, and duplicate-prevention behavior.
