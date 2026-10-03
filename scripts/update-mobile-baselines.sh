#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${E2E_STORAGE_STATE:-}" ]]; then
  echo "E2E_STORAGE_STATE is required to capture protected chart baselines." >&2
  echo "Example: E2E_STORAGE_STATE=/absolute/path/auth.json pnpm test:e2e:update" >&2
  exit 2
fi

if [[ ! -f "$E2E_STORAGE_STATE" ]]; then
  echo "Authenticated storage state does not exist: $E2E_STORAGE_STATE" >&2
  exit 2
fi

pnpm exec playwright test e2e/mobile-chart.spec.ts --update-snapshots
