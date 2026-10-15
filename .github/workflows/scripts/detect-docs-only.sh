#!/bin/bash
# Classify a pull request as docs-only when every changed path is under docs/.
# Appends docs-only=true|false to $GITHUB_OUTPUT.
#
# The pulls files API returns filename, and previous_filename when a file was
# renamed. A body that contains file objects but no names fails the step, so a
# broken projection cannot be mistaken for a non-docs change. No pull request
# number (for example workflow_dispatch) writes docs-only=false.

set -euo pipefail

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
  echo "GITHUB_OUTPUT is required" >&2
  exit 1
fi

write_result() {
  echo "docs-only=$1" >> "$GITHUB_OUTPUT"
  echo "docs-only=$1"
}

pr_number="${PR_NUMBER:-}"
if [[ -z "$pr_number" ]]; then
  echo "No pull request number; treating the change set as not docs-only."
  write_result false
  exit 0
fi

if [[ ! "$pr_number" =~ ^[0-9]+$ ]]; then
  echo "::error::PR_NUMBER must be numeric"
  exit 1
fi

repo="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
payload=$(gh api --paginate "repos/${repo}/pulls/${pr_number}/files")
object_count=$(jq 'length' <<<"$payload")
names=$(jq -r '.[] | (.filename // empty), (.previous_filename // empty)' <<<"$payload")

if [[ "$object_count" -gt 0 && -z "$names" ]]; then
  echo "::error::Pull request file list had ${object_count} entries but no filenames. Refusing to classify the change set."
  exit 1
fi

echo "Changed files:"
if [[ -n "$names" ]]; then
  printf '%s\n' "$names"
else
  echo "(none)"
fi

non_docs=""
if [[ -n "$names" ]]; then
  non_docs=$(printf '%s\n' "$names" | grep -v '^docs/' || true)
fi

if [[ -n "$names" && -z "$non_docs" ]]; then
  echo "Only docs/ changed."
  write_result true
  exit 0
fi

write_result false
