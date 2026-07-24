#!/usr/bin/env python3
"""
Lint GitHub Actions workflows for three footguns:

  1. Long-lived AWS credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).
     Must use OIDC (`role-to-assume`) except for files in STATIC_AWS_ALLOWLIST.
     This check is ALWAYS blocking.

  2. Script-injection surfaces: ${{ github.event.* }} / ${{ inputs.* }} expanded
     directly inside a `run:` block. Inputs must flow through the step\'s `env:`
     map so they are passed as process environment variables, not pasted into
     the shell source. This check emits warnings by default; pass `--strict` to
     make it blocking once the rest of the repo has been cleaned up.

  3. Unpinned `uses:` references. Every external action must be pinned to a
     full 40-character commit SHA (with the human-readable tag preserved as a
     trailing `# vX.Y.Z` comment) so a hijacked tag cannot silently inject
     code into our CI. Local refs (`./...`) and docker refs (`docker://...`)
     are exempt. This check is ALWAYS blocking.

Run locally:  python3 .github/workflows/scripts/check-workflow-security.py
CI:           same; exits 1 only if an AWS static-key regression or
              unpinned-action regression sneaks in.
Strict mode:  python3 .github/workflows/scripts/check-workflow-security.py --strict
"""
from __future__ import annotations
import argparse, pathlib, re, sys

WORKFLOW_DIR = pathlib.Path(".github/workflows")
COMPOSITE_ACTION_DIR = pathlib.Path(".github/actions")

# Files that are allowed to keep static AWS keys for now.
STATIC_AWS_ALLOWLIST = {
    "dev-deploy-inbound-mail.yml",
}

AWS_STATIC_PATTERNS = (
    re.compile(r"secrets\.AWS_ACCESS_KEY_ID"),
    re.compile(r"secrets\.AWS_SECRET_ACCESS_KEY"),
)

UNSAFE_EXPR = re.compile(
    r"\$\{\{\s*(github\.event\.inputs\.[A-Za-z0-9_]+|inputs\.[A-Za-z0-9_]+|"
    r"github\.event\.(issue|pull_request|comment|head_commit)\.[A-Za-z0-9_.]+)\s*}}"
)

USES_RE = re.compile(r"^\s*-?\s*uses:\s*([^\s#]+)")
SHA_RE = re.compile(r"^[0-9a-f]{40}$")


RUN_BLOCK_RE = re.compile(r"(\s*)(-\s+)?run:\s*[|>][+-]?\s*$")
RUN_INLINE_RE = re.compile(r"\s*(-\s+)?run:\s+(.+\S)\s*$")


def find_run_block_ranges(lines: list[str]) -> list[tuple[int, int]]:
    """Return (start, end) 0-based inclusive indices for each `run:` body.

    Captures both multiline `run: |` / `run: >` bodies and single-line inline
    `run: echo ...` commands (returned as start == end == that line index) so
    downstream injection scans cover both forms.
    """
    ranges: list[tuple[int, int]] = []
    i = 0
    while i < len(lines):
        m = RUN_BLOCK_RE.match(lines[i])
        if m:
            indent = len(m.group(1))
            start = i + 1
            j = start
            while j < len(lines):
                line = lines[j]
                if line.strip() == "":
                    j += 1
                    continue
                leading = len(line) - len(line.lstrip(" "))
                if leading <= indent:
                    break
                j += 1
            if start < j:
                ranges.append((start, j - 1))
            i = j
            continue
        if RUN_INLINE_RE.match(lines[i]):
            ranges.append((i, i))
        i += 1
    return ranges


def check_action_pinning(path: pathlib.Path, lines: list[str], errors: list[str]) -> None:
    """Every external `uses:` ref must be pinned to a 40-char commit SHA."""
    for idx, line in enumerate(lines, start=1):
        m = USES_RE.match(line)
        if not m:
            continue
        ref = m.group(1)
        if ref.startswith(("./", "../")) or ref.startswith("docker://"):
            continue
        if "@" not in ref:
            errors.append(
                f"{path}:{idx}: `uses: {ref}` is missing an `@<sha>` pin "
                f"\u2014 use `owner/repo@<40-char-sha> # tag` instead"
            )
            continue
        _, sha = ref.rsplit("@", 1)
        if not SHA_RE.match(sha):
            errors.append(
                f"{path}:{idx}: `uses: {ref}` is not pinned to a 40-char commit "
                f"SHA \u2014 use `owner/repo@<40-char-sha> # {sha}` instead "
                f"(see https://docs.github.com/en/actions/security-guides/"
                f"security-hardening-for-github-actions#using-third-party-actions)"
            )


def check_file(path: pathlib.Path) -> tuple[list[str], list[str]]:
    """Returns (errors, warnings) for a single workflow file."""
    errors: list[str] = []
    warnings: list[str] = []
    lines = path.read_text().splitlines()

    if path.name not in STATIC_AWS_ALLOWLIST:
        for idx, line in enumerate(lines, start=1):
            for pat in AWS_STATIC_PATTERNS:
                if pat.search(line):
                    errors.append(
                        f"{path}:{idx}: static AWS credential `{pat.pattern}` "
                        f"found \u2014 use OIDC (role-to-assume) instead"
                    )

    check_action_pinning(path, lines, errors)

    for start, end in find_run_block_ranges(lines):
        for idx in range(start, end + 1):
            for m in UNSAFE_EXPR.finditer(lines[idx]):
                warnings.append(
                    f"{path}:{idx + 1}: `{m.group(0)}` expanded directly inside "
                    f"a `run:` block \u2014 hoist to the step\'s `env:` map and "
                    f'reference "$VAR" instead (script-injection risk)'
                )
    return errors, warnings


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--strict",
        action="store_true",
        help="Treat script-injection warnings as errors (fails CI).",
    )
    args = ap.parse_args()

    if not WORKFLOW_DIR.is_dir():
        print(f"No workflow directory at {WORKFLOW_DIR}", file=sys.stderr)
        return 2

    paths: list[pathlib.Path] = list(WORKFLOW_DIR.glob("*.y*ml"))
    if COMPOSITE_ACTION_DIR.is_dir():
        paths.extend(COMPOSITE_ACTION_DIR.rglob("action.y*ml"))

    all_errors: list[str] = []
    all_warnings: list[str] = []
    for path in sorted(set(paths)):
        errs, warns = check_file(path)
        all_errors.extend(errs)
        all_warnings.extend(warns)

    if all_warnings:
        print("Workflow security warnings (script-injection surfaces):\n", file=sys.stderr)
        for w in all_warnings:
            print(f"  WARN: {w}", file=sys.stderr)

    if all_errors:
        print("\nWorkflow security errors (blocking):\n", file=sys.stderr)
        for e in all_errors:
            print(f"  ERROR: {e}", file=sys.stderr)

    if all_errors or (args.strict and all_warnings):
        print(
            "\nSee .github/workflows/scripts/check-workflow-security.py for rules.",
            file=sys.stderr,
        )
        return 1

    print(
        f"OK: no static AWS credential or unpinned-action regressions "
        f"({len(all_warnings)} injection warnings not failing the build)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
