---
name: testerarmy-cli
description: Use TesterArmy CLI to create, organize, and run dashboard-managed QA tests. Prefer saved tests, groups, project context, credentials, and remote runs over one-off local prompts. Trigger when defining regression coverage, adding QA flows, or wiring CI checks.
license: MIT
metadata:
  author: TesterArmy
  tags: testerarmy, qa, cli, dashboard-tests, regression, ci
---

# TesterArmy CLI

Create dashboard-managed QA coverage with `ta` / `testerarmy`.

Default to saved dashboard tests, groups, project context, credentials, and
remote runs. Use local `ta run "..."` only for quick exploration.

## When to Use

- Create persistent QA coverage for a feature or product area.
- Convert acceptance criteria into dashboard tests.
- Add or update smoke, regression, auth, billing, onboarding, or mobile flows.
- Prepare CI-visible groups for PRs or releases.

## Setup

Check auth:

```bash
ta status --json
```

If needed:

```bash
ta auth
TESTERARMY_API_KEY=<key> ta status --json
```

Discover scope:

```bash
ta projects list --json
ta groups list --project <projectId> --json
ta tests list --project <projectId> --json
```

Use IDs exactly as returned.

## Project Context

Create a project:

```bash
echo '{"name":"Example","url":"https://example.com","projectType":"web"}' | ta projects create --json
```

Store app knowledge:

```bash
echo '{"category":"site_structure","title":"Auth route","content":"Login is at /login","importance":"high"}' | ta memories create --project <projectId> --json
```

Memory categories: `site_structure`, `test_insights`, `user_preferences`.

Create credentials for login or inbox flows:

```bash
echo '{"kind":"login","label":"Admin","username":"admin@example.com","password":"secret"}' | ta projects credentials-create <projectId> --json
echo '{"kind":"inbox","label":"Signup inbox"}' | ta projects credentials-create <projectId> --json
```

Never print real secrets in final messages.

## Tests

Create:

```bash
echo '{"title":"Login flow","description":"User can sign in and reach the dashboard","steps":[{"title":"Navigate to /login","type":"act"},{"title":"Sign in with the saved admin credentials","type":"login","credentialId":"<credentialId>"},{"title":"Dashboard loads and shows the project list","type":"assert"}]}' | ta tests create --project <projectId> --json
```

Create in a group:

```bash
echo '{"title":"Pricing CTA","steps":[{"title":"Open /pricing","type":"act"},{"title":"Click the primary CTA","type":"act"},{"title":"Signup or dashboard flow starts","type":"assert"}]}' | ta tests create --project <projectId> --group <groupId> --json
```

Payload:

```json
{
  "title": "string, required",
  "description": "string, optional",
  "platform": "web or mobile, optional",
  "steps": [
    { "title": "User action", "type": "act" },
    { "title": "Expected result", "type": "assert" },
    { "title": "Login instruction", "type": "login", "credentialId": "uuid" },
    { "title": "Use temporary email", "type": "login", "temporaryEmail": true },
    { "title": "Screenshot label", "type": "screenshot" }
  ]
}
```

Rules:

- Cover one user journey.
- Prefer 3-8 meaningful steps.
- Use `act` for navigation, clicks, typing, upload, and other user actions.
- Use `assert` for visible outcomes, persisted state, email delivery, or URL changes.
- Use `login` with `credentialId` or `temporaryEmail`; do not put passwords in step titles.
- Use `screenshot` only for important visual checkpoints.
- Maximum 50 steps per test.

Inspect before changing:

```bash
ta tests get <testId> --json
```

Update title, description, or steps:

```bash
echo '{"title":"Updated login smoke"}' | ta tests update <testId> --json
echo '{"steps":[{"title":"Open /login","type":"act"},{"title":"Sign in","type":"login","credentialId":"<credentialId>"},{"title":"Dashboard is visible","type":"assert"}]}' | ta tests update <testId> --json
```

Replacing `steps` requires the complete array.

## Groups

Create suites:

```bash
echo '{"projectId":"<projectId>","name":"Smoke"}' | ta groups create --json
ta groups add-test <groupId> <testId> --json
ta groups remove-test <groupId> <testId> --json
```

Common groups: `Smoke`, `Auth`, `Core journeys`, `Mobile smoke`.

## Runs

Modes:

- Default/local: fetches a saved test, then runs it on this machine.
- `--remote`: queues the saved test in TesterArmy cloud.

Local debugging:

```bash
ta tests run <testId> --url http://localhost:3000 --json
ta tests run --group <groupId> --project <projectId> --url http://localhost:3000 --parallel 3 --json
```

Remote validation:

```bash
ta tests run <testId> --remote --wait --json
ta tests run --group <groupId> --project <projectId> --remote --wait --json
```

Defaults:

- No `--remote`: local browser execution.
- `--remote`: cloud execution.
- `--wait`: wait for remote results.
- Local-only flags such as `--headed`, `--browser`, `--timeout`, and `--system-prompt-file` are ignored with `--remote`.
- Remote group runs can use `--environment production|preview`.
- Remote single-test runs can use `--mode fast|deep`.

CI:

```bash
ta ci --group <groupId> --project <projectId> --target-url https://staging.example.com --json
```

Runs:

```bash
ta runs list --project <projectId> --json
ta runs get <runId> --json
ta runs wait <runId> --timeout 600000 --json
ta runs cancel <runId> --json
```

## Mobile App Coverage

Upload an iOS Simulator app before cloud runs:

```bash
ta upload-app --app-path ios/build/Build/Products/Release-iphonesimulator/MyApp.app --project <projectId> --json
ta ci --group <groupId> --project <projectId> --app-id <appId> --delete-app-after-run --json
```

Supported uploads: `.app`, `.app.zip`, `.zip`, `.app.tar.gz`, `.tar.gz`, `.tgz`.
`.ipa` and Android artifacts are not supported yet.

## Local Prompt

`ta run <prompt>` runs an ad hoc local browser test:

```bash
ta run "check pricing CTA" --url https://example.com --json
```

Use only to explore before creating or updating dashboard tests. Use
`ta tests create` and `ta tests run --group` for durable workflows.

## Reporting

Report:

- Project ID/name
- Test IDs and titles created or updated
- Group IDs/names touched
- Remote validation command and result, if run
- Run ID or artifact/output path, if available

Do not claim durable coverage unless `ta tests create` or `ta tests update` ran.

## References

| File | Description |
| --- | --- |
| [reporting-template.md][reporting-template] | Dashboard coverage report template |

[reporting-template]: references/reporting-template.md
