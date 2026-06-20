# Demo script

Opening, 30–45 seconds

“This app turns messy founder work into structured next actions. First it extracts tasks from a message and asks for approval before anything is saved. Then it generates grounded preparation for a meeting or event, using the founder’s actual profile, company facts, audience context, and target details.”

Three-minute demo

1. Open the app home page.
2. In the AI test panel, enter: `I'll send Arjun the proposal tomorrow by 4 PM.`
3. Click Analyze with AI.
4. Show the readable suggestion card.
5. Click Add to Tasks.
6. Show the task appear in Today or Upcoming.
7. Refresh the page and confirm the task persists.
8. Repeat Add and confirm duplicate acceptance is blocked.
9. Open the preparation flow for a sales or partnership interaction.
10. Click Generate Preparation Strategy.
11. Show the grounded strategy sections, missing information, and any retrieval status.
12. Click Add preparation tasks and Add follow-up tasks if present.
13. Refresh and confirm persistence.

Expected results

- task suggestion is readable, not raw JSON
- Add / Edit / Dismiss work
- accepted task persists in Supabase and after refresh
- preparation strategy is grounded and persisted
- duplicate creation is blocked

Fallback demo if the model call fails

- show the last successful saved suggestion or strategy
- explain that the UI still supports approval, editing, persistence, and cleanup even if the live model is unavailable

Closing statement

“The AI is useful here only because it is structured, approval-based, and grounded in the app’s own data. The user stays in control, and the app preserves what it saves.”
