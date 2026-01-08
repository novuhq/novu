# ClickHouse Data Seeding Script

A comprehensive TypeScript script to populate ClickHouse observability tables with realistic mock data for load testing and development.

## Overview

This seeding script generates realistic Novu usage data across multiple organizations, environments, and workflows. It creates hierarchical data that mimics real-world scenarios including:

- Multiple organization profiles (Enterprise, Large, Medium)
- Multiple environments per organization (Production, Staging, Development)
- Various workflow types with different channel combinations
- Realistic time distribution patterns (business hours, weekends, peak patterns)
- Workflow runs, step runs, and trace events

## Architecture

```
Organization
  └── Environment(s)
      ├── Workflow(s)
      │   └── Workflow Run(s)
      │       └── Step Run(s)
      │           └── Trace(s)
      └── Subscriber(s)
```

## Prerequisites

1. ClickHouse instance running and accessible
2. Environment variables set:
   ```bash
   CLICK_HOUSE_URL=http://localhost:8123
   CLICK_HOUSE_DATABASE=novu
   CLICK_HOUSE_USER=default
   CLICK_HOUSE_PASSWORD=
   ```

3. ClickHouse tables and materialized views created (run migrations first)

## Usage

### Basic Usage

From the `apps/api` directory:

```bash
pnpm seed:clickhouse
```

Or from the root directory:

```bash
pnpm --filter @novu/api-service seed:clickhouse
```

This will generate:
- 10 organizations (3 Enterprise, 4 Large, 3 Medium)
- 30 days of data
- Realistic volume based on organization profile
- ~500K+ total records

### High Volume Load Testing

```bash
pnpm seed:clickhouse -- --scale=10 --organizations=50
```

This will generate:
- 50 organizations
- 10x the normal data volume per organization
- 30 days of data
- ~25M+ total records

### Custom Configuration

```bash
pnpm seed:clickhouse -- \
  --organizations=20 \
  --days=7 \
  --scale=5 \
  --batch-size=5000 \
  --start-date=2024-01-01
```

## Configuration Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--organizations` | `-o` | 10 | Number of organizations to create |
| `--days` | `-d` | 30 | Days of data to generate |
| `--scale` | `-s` | 1.0 | Data volume multiplier for load testing |
| `--batch-size` | `-b` | 10000 | Records per ClickHouse insert batch |
| `--start-date` | - | Last month | Start date for data generation (YYYY-MM-DD) |
| `--help` | `-h` | - | Show help message |

## Data Volume Estimates

### At scale=1 (default)

| Profile | Count | Runs/Day | Total/Month |
|---------|-------|----------|-------------|
| Enterprise | 3 | 20K-50K | 1.8M-4.5M |
| Large | 4 | 5K-15K | 600K-1.8M |
| Medium | 3 | 500-2K | 45K-180K |

**Total**: ~2.5M-6.5M workflow runs per month

### Derived Data

- **Step Runs**: 2-5x workflow runs (based on channels)
- **Traces**: 2-8x step runs (based on events)
- **Total Records**: 15M-50M+ per month at scale=1

### At scale=10

Multiply all numbers by 10x for load testing scenarios.

## Organization Profiles

### Enterprise (High Volume)
- **Runs/Day**: 20,000-50,000
- **Workflows**: 8-15
- **Subscribers**: 5,000-10,000
- **Environments**: 2-3

### Large
- **Runs/Day**: 5,000-15,000
- **Workflows**: 5-10
- **Subscribers**: 1,000-5,000
- **Environments**: 2-3

### Medium
- **Runs/Day**: 500-2,000
- **Workflows**: 3-5
- **Subscribers**: 100-500
- **Environments**: 1-2

## Workflow Templates

The script generates realistic workflow patterns:

| Type | Channels | Weight | Example |
|------|----------|--------|---------|
| Transactional | email + in_app | 40% | Order Confirmation |
| Marketing | email | 25% | Newsletter |
| Alerts | push + sms | 15% | Critical Alert |
| Multi-channel | email + in_app + push | 20% | Campaign Update |

## Time Distribution

### Business Hours Weighting
- **9am-6pm**: 2.5x normal volume
- **7am-9am, 6pm-9pm**: 1.2x normal volume
- **9pm-7am**: 0.3x normal volume

### Weekend Reduction
- **Weekends**: 30% of weekday volume

### Peak Patterns
- **Monthly peaks**: 1st and 15th of the month
- **Weekly peaks**: Tuesday 10am, Thursday 2pm

## Data Tables Populated

### Primary Tables (Direct Insert)
1. **workflow_runs**: Workflow execution records
2. **step_runs**: Individual step executions
3. **traces**: Event traces and logs

### Materialized Views (Auto-Populated)
1. **workflow_runs_daily**: Daily aggregations of workflow runs
2. **step_runs_daily**: Daily aggregations of step runs
3. **traces_daily**: Daily aggregations of trace events

The materialized views are automatically populated by ClickHouse as data is inserted into the primary tables.

## Status Distributions

### Workflow Runs
- `completed`: 85%
- `processing`: 5%
- `error`: 10%

### Step Runs
- `completed`: 88%
- `failed`: 7%
- `skipped`: 3%
- `delayed`: 2%

### Delivery Lifecycle
- `delivered`: 70%
- `sent`: 15%
- `errored`: 8%
- `skipped`: 4%
- `canceled`: 2%
- `merged`: 1%

## Example Output

```
============================================================
ClickHouse Data Seeding Script
============================================================

Configuration:
  Organizations: 10
  Days:          30
  Scale:         1x
  Batch Size:    10000
  Start Date:    2024-12-01

✓ Connected to ClickHouse

Phase 1: Generating Organizations and Structure
------------------------------------------------------------
✓ Generated 10 organizations
  Environments: 21
  Workflows:    147
  Subscribers:  32,450

  Organization Breakdown:
    Enterprise: 3
    Large:      4
    Medium:     3

Phase 2: Generating Workflow Runs
------------------------------------------------------------
✓ Generated 2,847,593 workflow runs

Phase 3: Generating Step Runs
------------------------------------------------------------
✓ Generated 7,119,483 step runs

Phase 4: Generating Traces
------------------------------------------------------------
✓ Generated 21,358,449 traces

Phase 5: Inserting Data into ClickHouse
------------------------------------------------------------
...

============================================================
Insertion Statistics
============================================================
Workflow Runs: 2,847,593
Step Runs:     7,119,483
Traces:        21,358,449
Total Records: 31,325,525
Duration:      127.34s
============================================================

Additional Information:
  Estimated Size: 14.2 GB
  Records/Second: 246,123

✓ Data seeding completed successfully!
```

## Troubleshooting

### Connection Errors
Ensure ClickHouse environment variables are set correctly:
```bash
export CLICK_HOUSE_URL=http://localhost:8123
export CLICK_HOUSE_DATABASE=novu
```

### Out of Memory
Reduce batch size for systems with limited memory:
```bash
pnpm seed:clickhouse -- --batch-size=5000
```

### Slow Insertion
Increase batch size for faster insertion (if memory allows):
```bash
pnpm seed:clickhouse -- --batch-size=20000
```

## Development

### File Structure
```
apps/api/scripts/
├── seed-clickhouse.ts              # Main entry point
└── clickhouse-seeder/
    ├── config.ts                   # Configuration and CLI parsing
    ├── time-distribution.ts        # Time pattern generation
    ├── generators.ts               # Data generation logic
    ├── inserter.ts                 # Batched ClickHouse insertion
    └── README.md                   # This file
```

### Adding New Organization Profiles

Edit `config.ts` and add to `ORGANIZATION_PROFILES`:

```typescript
export const ORGANIZATION_PROFILES = {
  // ... existing profiles
  startup: {
    type: 'startup',
    runsPerDayMin: 10,
    runsPerDayMax: 100,
    workflowsMin: 1,
    workflowsMax: 3,
    subscribersMin: 10,
    subscribersMax: 100,
    environmentsMin: 1,
    environmentsMax: 1,
  },
};
```

### Adding New Workflow Templates

Edit `config.ts` and add to `WORKFLOW_TEMPLATES`:

```typescript
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ... existing templates
  { 
    type: 'support', 
    name: 'Support Ticket', 
    channels: ['email', 'sms'], 
    weight: 0.1 
  },
];
```

## Performance Tips

1. **Use high scale factors** for load testing: `--scale=10` or higher
2. **Optimize batch size** based on your system's memory
3. **Run during off-peak hours** to avoid impacting production systems
4. **Monitor ClickHouse** resources during large imports
5. **Use async inserts** (already enabled in the script)

## Notes

- Data is generated with realistic time distributions matching business patterns
- All IDs are randomly generated and unique
- Subscriber external IDs follow pattern: `user_1`, `user_2`, etc.
- Materialized views process data asynchronously after insertion
- TTL settings from schema definitions are respected
