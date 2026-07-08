# TypeScript 5.6.2 (`tsc`) vs TypeScript 7.0 (`tsgo`) build-time benchmark

- `tsc`: Version 5.6.2
- `tsgo`: Version 7.0.0-dev.20260704.1 (`@typescript/native-preview`)
- Samples: 5 timed runs (+1 warm-up discarded), median reported
- Both compilers run the **same** `tsconfig.tsgo.json` per project, type-check only (`noEmit`)

| Project | Mode | `tsc` 5.6.2 (median) | `tsgo` 7.0 (median) | Speedup |
| --- | --- | --- | --- | --- |
| `@novu/shared` | type-check | 1.32s | 0.18s | **7.4x** |
| `@novu/dal` | type-check | 2.94s | 1.08s | **2.7x** |
| `@novu/dashboard` | type-check (-b) | 22.81s | 5.07s | **4.5x** |

