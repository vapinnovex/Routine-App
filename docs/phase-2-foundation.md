# Phase 2: shared daily health questions and leaderboard

## Implemented foundation

- Backward-compatible account schema version 1.
- `GET /api/v1/capabilities` advertises API/schema versions and keeps `dailyQuestions` and `leaderboard` disabled.
- Validated public question, option, submission and leaderboard-row contracts in `backend/app/schemas/challenges.py`.
- Public questions exclude answer keys. Submissions reject user IDs, points and correctness; the server must derive these values.
- No unfinished health pages or fake leaderboard are shown in Phase 1.

## Proposed feature boundaries

Keep shared questions outside the personal `app_data` aggregate. All users should receive the same published question/version for the active server window, regardless of local time or personal task changes.

| Collection | Ownership / index | Purpose |
| --- | --- | --- |
| daily_questions | Admin-published; unique `(day, version)` plus active-publication lookup | Prompt, options, publication window and version; answer key excluded from public responses |
| challenge_answers | Session-owned; unique `(user_id, question_id, question_version)` | One accepted answer, server timestamp and idempotency identity |
| score_events | Server-only; unique answer/event identity | Auditable scoring, safe retries and corrections |
| leaderboard_profiles | User-owned display alias and explicit opt-in | Public display identity; never email or medical answers |

These are architectural contracts, not provisioned collections or live routes. Implement migrations/indexes with the feature, after choosing the release rules below.

## Intended flow

1. Home shows today's published question and an explicit closing time.
2. A user selects an answer and submits once. The API authenticates the user, checks the server window and version, validates the option, and atomically/idempotently accepts the answer.
3. Confirmation shows submission state. Feedback timing depends on whether the feature is an educational quiz or a private wellness check-in.
4. A separate leaderboard reads server-generated aggregates with pagination and stable tie handling. Participation is opt-in; users can remove their public listing without deleting private routine data.
5. Loading, already-answered, closed, offline, and not-yet-published states have explicit UI treatment.

## Decisions required before activation

- Are questions educational quizzes with correct answers, or personal wellness check-ins? Do not rank users by self-reported health status. If check-ins are used, score participation only and keep answers private.
- Choose one shared publication timezone and opening/closing policy. UTC timestamps are authoritative; a client clock cannot extend the deadline.
- Define scoring, streaks, ties, leaderboard periods and corrections. Do not derive competitive points from editable personal task history.
- Define answer-feedback timing and content review. Any health guidance needs a reviewed content process and sources.
- Choose moderation, consent, retention, deletion and alias rules before making any public ranking available.

## Acceptance criteria for Phase 2

Different accounts see the same question/version; concurrent duplicate submissions award points once; stale versions and closed windows are rejected; answer keys never appear in pre-submission payloads; private answers cannot be read through rankings; opt-out removes the public profile; server restart and retry preserve scoring; Phase 1 tasks/timers continue working with the feature flags off.
