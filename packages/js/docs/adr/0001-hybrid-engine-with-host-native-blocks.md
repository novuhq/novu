---
status: accepted
date: 2026-09-04
---

# Keep one Solid engine for the Inbox shell, render the notification item as host-native blocks

The Inbox is a single Solid engine mounted into host DOM, which made every host customisation an opaque portal and blocked React users from composing or reusing the default notification item. We decided to keep Solid as the only engine for the shell (popover, bell, header, tabs, list, preferences, subscription, connect buttons) and to make the notification item a set of host-native blocks whose behaviour and styling come from a framework-neutral core; interactive leaves stay engine islands: the default actions (read, archive, snooze, with their dropdowns and pickers) and the custom primary and secondary action buttons. This buys children-level composition of the item for roughly 1,500 lines of parity work instead of the ~15,000 a full native React UI would cost, and any shell piece can later become host-native on the same core without a rewrite.

## Considered options

- Bridge only: compose the item from per-block engine islands. Rejected because every block carries two wrapper divs, so flex gaps, hover groups and borders land on wrappers instead of the blocks.
- Full native React UI on a headless core. Rejected for now: two complete UIs to keep in lockstep before any user benefit.

## Consequences

- The structural parts of the notification item (root, avatar, content, text, subject, body, date, dot) exist twice, in Solid and in React, sharing the core for behaviour and styling. Feature work on those parts touches both; feature work on actions touches only the engine.
- Server rendering of Inbox markup is explicitly out of scope.
