# Telemetry Guide

CheckMate includes a built-in telemetry system that tracks token usage and costs for AI model interactions. This guide explains how to use and configure the telemetry system.

## Overview

The telemetry system automatically records token usage and cost information for each AI model interaction. This data is stored locally in the `.checkmate-telemetry/` directory, which is automatically added to `.gitignore` during initialization.

Key features:
- Tracks input and output tokens for each model call
- Estimates costs based on current pricing models
- Aggregates usage data across sessions
- Provides filtering by time period or session ID
- Supports both command-line and JSON output formats

## Using the Stats Command

The `stats` command is the primary interface for viewing telemetry data:

```bash
# Show stats for current session (default)
checkmate stats

# Show stats for all sessions
checkmate stats --all

# Show stats for the last 24 hours
checkmate stats --since 24h

# Show stats for the last 7 days
checkmate stats --since 7d

# Show stats for a specific session ID
checkmate stats --session <session-id>

# Get output in JSON format for scripting
checkmate stats --json
```

### Time Filter Options

The `--since` flag accepts the following formats:
- Hours: `1h`, `6h`, `24h`
- Days: `1d`, `7d`, `30d`
- Weeks: `1w`, `2w`, `4w`
- Months: `1m`, `3m`, `6m`

### Example Output

```
📊 CheckMate Token Usage Statistics

Period: Current session

┌─────────────────────────┬──────────────┬───────────────┬──────────────┬───────────┐
│ Model                   │ Input Tokens │ Output Tokens │ Total Tokens │ Est. Cost │
├─────────────────────────┼──────────────┼───────────────┼──────────────┼───────────┤
│ openai/gpt-4o           │ 5,234        │ 1,267         │ 6,501        │ $0.0650   │
│ anthropic/claude-3-haiku│ 3,125        │ 876           │ 4,001        │ $0.0100   │
├─────────────────────────┼──────────────┼───────────────┼──────────────┼───────────┤
│ TOTAL                   │ 8,359        │ 2,143         │ 10,502       │ $0.0750   │
└─────────────────────────┴──────────────┴───────────────┴──────────────┴───────────┘

Total tokens: 10,502
Estimated cost: $0.0750
```

## Configuration

You can configure telemetry behavior in your `.checkmate` file:

```yaml
# Telemetry Settings
telemetry:
  enabled: true  # Set to false to disable telemetry
  retention: 30  # Number of days to keep telemetry data
```

## Data Storage

Telemetry data is stored in JSONL files in the `.checkmate-telemetry/` directory:
- One file per session by default
- Files rotate when they exceed 5MB
- Each line contains a single JSON object with token usage data

Example of a telemetry entry:
```json
{
  "ts": "2023-05-21T15:32:47.123Z",
  "cmd": "gen",
  "provider": "openai",
  "model": "gpt-4o",
  "in": 1543,
  "out": 378,
  "ms": 2345,
  "estimated": false
}
```

## Token Counting

Telemetry records both accurate and estimated token counts:
- **Accurate counts**: When the API provider returns usage information
- **Estimated counts**: When the provider doesn't return usage info (approximated based on text length)

Estimated counts are marked with a warning indicator (⚠️) in the stats output.

## Pricing Model

Token costs are calculated based on the following default rates (per 1,000 tokens):

| Model | Price per 1K tokens |
|-------|---------------------|
| openai/gpt-4o | $0.01 |
| openai/gpt-4o-mini | $0.005 |
| anthropic/claude-3-opus | $0.015 |
| anthropic/claude-3-sonnet | $0.008 |
| anthropic/claude-3-haiku | $0.00025 |

You can customize pricing in your `.checkmate` config:

```yaml
pricing:
  "openai/gpt-4o": 0.01
  "anthropic/claude-3-sonnet": 0.008
```

## Privacy

All telemetry data is stored locally on your machine. CheckMate does not send any telemetry data to external servers. 