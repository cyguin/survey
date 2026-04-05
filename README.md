# @cyguin/survey

Post-action micro-survey system. Trigger structured 1-3 question modals on specific app events (cancel flow, post-upgrade, onboarding completion) and aggregate responses server-side.

## The Deal

`@cyguin/survey` gives you a lightweight survey system with three question types (NPS, multiple choice, short text), a drop-in React modal, and a server-side adapter interface for persistence.

## Install

```bash
npm install @cyguin/survey
```

Requires Next.js App Router and React 18+.

## Usage

### Client: Trigger a survey

```ts
import { showSurvey } from '@cyguin/survey';

const result = await showSurvey('churn-survey', userId);
// result: { surveyId: string, questions: Question[] }

const closeModal = result.modal?.(); // opens the SurveyModal
// call closeModal() to programmatically dismiss
```

### Client: useSurveyModal hook

```ts
import { useSurveyModal } from '@cyguin/survey';

function MyPage() {
  const { isOpen, open, close, modal } = useSurveyModal(
    'survey-123',
    [
      { id: 'q1', surveyId: 'survey-123', questionText: 'How likely?', questionType: 'nps', questionOrder: 1 },
    ],
    userId,
    { onComplete: (answers) => console.log(answers) }
  );

  return (
    <>
      <button onClick={open}>Take Survey</button>
      {modal}
    </>
  );
}
```

### Server: API routes

Place these in your Next.js app router:

- `POST /api/survey/trigger` — look up active survey by trigger slug
- `GET /api/survey/[surveyId]` — fetch survey questions
- `POST /api/survey/[surveyId]/responses` — submit answers

### Adapter: wire up persistence

```ts
import { getSurveyAdapter, setSurveyAdapter } from '@cyguin/survey/adapter';

// Implement the interface
const myAdapter = {
  async findByTrigger(trigger) { /* ... */ },
  async getQuestions(surveyId) { /* ... */ },
  async saveResponses(responses) { /* ... */ },
  async getAggregate(surveyId) { /* ... */ },
};

setSurveyAdapter(myAdapter);
```

## Exports

| Export | Type | Description |
|--------|------|-------------|
| `SurveyModal` | Component | Modal UI with all three question types |
| `showSurvey` | Function | Client-side trigger + modal opener |
| `useSurveyModal` | Hook | Controlled modal state hook |
| `SurveyModalProps` | Type | Props for `<SurveyModal />` |
| `Question` | Type | Question shape |
| `Answer` | Type | Answer shape |
| `QuestionType` | Type | `'nps' \| 'multiple_choice' \| 'short_text'` |
| `TriggerResponse` | Type | Response from trigger API |
| `SubmitResponse` | Type | Response from submit API |
| `SurveyConfig` | Type | Client-side config |
| `getSurveyAdapter` | Function | Get the current adapter |
| `setSurveyAdapter` | Function | Set the adapter |

## Configuration

```ts
interface SurveyConfig {
  autoDismissMs?: number;  // auto-dismiss after N ms (0 = disabled)
  minAnswers?: number;     // min answers to count as completed
  apiBase?: string;        // custom API base URL (defaults to relative)
}
```

## Requirements

- Next.js App Router (>=14)
- React (>=18)
- CSS custom properties (`--cyguin-*` tokens) for brand theming

## Status

Experimental. API surface may change.

## License

MIT
