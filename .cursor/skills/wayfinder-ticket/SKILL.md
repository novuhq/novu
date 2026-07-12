---
name: wayfinder-ticket
description: >-
  Resolve exactly one Wayfinder ticket on the repo's Linear map: claim first,
  decide, record, stop. Use when the user attaches this skill, says "work
  through the map", or pastes a Wayfinder ticket/map URL for a single-ticket
  session.
disable-model-invocation: true
---

# Wayfinder ticket

Work through the map. Claim this ticket first, resolve only this ticket, then stop.

## Steps

1. Read `docs/agents/skill-config/issue-tracker.md` (Linear Wayfinding ops) and follow `.agents/skills/wayfinder/SKILL.md` **Work through the map** — do not chart a new map.
2. Load the map (parent `wayfinder:map`). If the user named a ticket, use it; else take the first frontier ticket (open, unblocked, unclaimed).
3. **Claim first** — assign the ticket to yourself in Linear before any grilling, research, or edits.
4. Resolve that ticket only (grill / research / prototype / task per its `wayfinder:<type>` label). Refer to issues by **title** (linked), never bare ids.
5. Record: resolution comment → close ticket → append one gist line to the map's **Decisions so far**. Graduate fog / wire new tickets only if this answer made them sharp.
6. **Stop.** Do not start another ticket in this session. Do not implement the destination unless the ticket type is `task` and its question requires that work to unblock a decision.
