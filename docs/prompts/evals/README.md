# Prompt eval results

One JSON file per eval run: `YYYYMMDD-<prompt-key>.json` (ARCHITECTURE §4).

Run evals with a real API key (~S$0.06 per case, 5 cases):

```bash
ANTHROPIC_API_KEY=sk-... pnpm --filter @rentowl/prompts eval
```

The key is also picked up from `apps/web/.env.local`. Robustness mode
(acceptance: schema-valid output across 20 random inputs):

```bash
EVAL_ROBUSTNESS=20 pnpm --filter @rentowl/prompts eval
```

Commit the results file with the prompt change it validates — regressions
are diffs against the previous baseline.
