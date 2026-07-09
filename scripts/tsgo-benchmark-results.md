# TypeScript 5.6.2 (`tsc`) vs TypeScript 7.0 (`tsgo`) build-time benchmark

- `tsc`: Version 5.6.2 (baseline only — not used by migrated packages)
- `tsgo`: Version 7.0.0-dev.20260704.1 (`@typescript/native-preview`) — production compiler for migrated packages
- Samples: 3 timed runs (+1 warm-up discarded), median reported
- Migrated packages use `tsgo` exclusively in build/typecheck scripts

| Project | Mode | `tsc` 5.6.2 (median) | `tsgo` 7.0 (median) | Speedup |
| --- | --- | --- | --- | --- |
| `@novu/shared` | type-check | 0.74s | 0.13s | **5.7x** |
| `@novu/dal` | type-check | 3.12s | 1.11s | **2.8x** |
| `@novu/dashboard` | type-check (-b) | 24.44s | 5.77s | **4.2x** |
| `@novu/inbound-mail` | type-check | 2.19s | 0.41s | **5.3x** |
| `@novu/stateless` | type-check | 0.73s | 0.11s | **6.4x** |
| `@novu/chat-sdk-adapter` | type-check | 0.66s | 0.10s | **6.4x** |
| `@novu/testing` | type-check | 1.32s | 0.20s | **6.6x** |
| `@novu/notifications` | type-check | 1.61s | 0.30s | **5.4x** |
| `@novu/ee-api` | type-check | 2.17s | 0.44s | **4.9x** |

