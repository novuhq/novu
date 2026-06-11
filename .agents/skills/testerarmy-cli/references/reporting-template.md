# Dashboard Coverage Report Template

Use this shape in final updates. Prefer remote `--json` validation.

```md
TesterArmy:
- Project: Example (<projectId>)
- Created: Login flow (<testId>)
- Group: Smoke (<groupId>)
- Validation: ta tests run <testId> --remote --wait --json
- Result: PASS
- Run: <runId>
```

If failed:

```md
TesterArmy:
- Project: Example (<projectId>)
- Updated: Checkout smoke (<testId>)
- Group: Smoke (<groupId>)
- Validation: ta tests run --group <groupId> --project <projectId> --remote --wait --json
- Result: FAILED
- Run: <runId>
- Failure: "Checkout success screen did not appear"
```
