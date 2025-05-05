# CheckMate Architecture Document

## Overview

CheckMate is a CLI tool that manages specifications for software features and verifies their implementation using automated tests. It bridges the gap between natural language descriptions and testable code through a combination of human-readable specs and machine-testable criteria.

## Core Concepts

### 1. Specifications (Specs)

Specs are the central concept in CheckMate. A spec is a document that describes a feature to be implemented and the criteria to verify it works correctly. There are two types:

- **User Specs** (.md files): Human-readable Markdown files that describe features and verification criteria in natural language. Located in `checkmate/specs/`.
- **Agent Specs** (.yaml files): Machine-readable YAML files that define programmatic test code to verify implementations. Located in `checkmate/specs/agents/`.

### 2. Checks

Each spec contains a list of checks (called "requirements" in YAML files for historical reasons). These are individual verifiable criteria that must be met for a feature to be considered complete.

### 3. MCP (Model-Code-Prompt)

CheckMate uses MCP as a mechanism to interact with large language models for spec generation and analysis. This is the system that allows the tool to reason about features and generate appropriate specs.

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Command Layer   │────▶│ Business Logic  │────▶│ Execution Layer │
│ (CLI Interface) │     │ (Feature/Specs) │     │ (Test Runner)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         ▼                      ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Shell Commands  │     │ File/Context    │     │ MCP Integration │
│ & UI Components │     │ Management      │     │ (AI Models)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │ File Storage    │
                        │ (Specs, Config) │
                        └─────────────────┘
```

## Component Breakdown

### 1. Command Layer

Located in `src/commands/`:

- **run.ts**: Main command execution orchestrator
- **gen.ts**: Generates new specs from feature descriptions
- **draft.ts**: Creates spec drafts without writing to disk
- **save.ts**: Saves reviewed spec drafts to disk
- **promote.ts**: Promotes user specs to agent specs
- **status.ts**: Shows status of all specs
- **watch.ts**: Monitors specs in real-time
- **create.ts**: Creates specs from external inputs
- **affected.ts**: Finds specs affected by code changes
- **initialize.ts**: Sets up the CheckMate environment

### 2. Business Logic

Located in `src/lib/`:

- **specs.ts**: Core spec management (parsing, validation, listing)
- **splitter.ts**: Breaks down complex requirements into atomic features
- **executor.ts**: Executes tests associated with specs
- **context.ts**: Builds relevant file context for features
- **specAuthor.ts**: Generates spec content using AI
- **models.ts**: Interfaces with AI models
- **config.ts**: Manages configuration
- **tree.ts**: Handles file system operations
- **cursorRules.ts**: Manages integration with Cursor IDE

### 3. Execution Layer

- **test-file.ts**: Orchestrates test execution
- Test code embedded in agent spec files

### 4. Storage Layer

- **checkmate/specs/**: User-readable Markdown specs
- **checkmate/specs/agents/**: Machine-executable agent specs
- **.checkmate/**: Configuration and state files
- **checkmate/cache/**: Cached contexts and model responses
- **checkmate/logs/**: Execution logs

## Data Flow

### Spec Creation Flow

```
User Request ───▶ Command Processing ───▶ Feature Splitting
      │                                        │
      ▼                                        ▼
 Context Building ◀─── File Analysis ◀─── Feature Analysis
      │
      ▼
 Spec Generation ───▶ Spec Storage ───▶ Status Update
```

### Spec Execution Flow

```
Run Command ───▶ Spec Loading ───▶ Test Code Preparation
      │                                   │
      ▼                                   ▼
 Status Reporting ◀─── Result Collection ◀─── Test Execution
```

### Promotion Flow

```
User Spec ───▶ Markdown Parsing ───▶ YAML Generation
                                           │
                                           ▼
                                     Agent Spec Creation
```

## Key Interfaces

### 1. Requirement Interface

```typescript
interface Requirement {
  id: string;            // Unique identifier
  require: string;       // Description of the requirement
  text?: string;         // Optional additional text
  test?: string;         // Test code (for agent specs)
  status: boolean;       // Whether the requirement passes
}
```

### 2. Spec Interface

```typescript
interface Spec {
  title: string;         // Title of the specification
  files: string[];       // Relevant file paths
  requirements: Requirement[]; // List of requirements
  machine?: boolean;     // Whether this is a machine-executable spec
}
```

### 3. Feature Interface

```typescript
interface Feature {
  title: string;         // Feature title
  slug: string;          // URL-friendly identifier
  description: string;   // Feature description
}
```

## Configuration System

CheckMate uses a configuration file `.checkmate` (with `.checkmate.example` as a template) to control behavior. Key configuration options include:

- `model`: Default AI model to use (e.g., "gpt-4-turbo")
- `context_top_n`: Number of context files to include
- `api_key`: API key for AI model provider
- `api_base`: Base URL for API requests
- `show_thinking`: Whether to display thinking indicators
- `spec_dir`: Directory for specifications

## MCP Event System

The MCP (Model-Code-Prompt) event system enables the Checkmate CLI to interact with large language models through a standardized interface:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Model     │────▶│    Code     │────▶│   Prompt    │
│  Reasoning  │     │ Generation  │     │  Template   │
└─────────────┘     └─────────────┘     └─────────────┘
        │                 │                   │
        └─────────────────┼───────────────────┘
                          ▼
                   ┌─────────────┐
                   │ Event System │
                   └─────────────┘
```

Events include:
- **start**: Beginning of an MCP operation
- **progress**: Updates during processing
- **complete**: Successful completion
- **error**: Failure conditions

## Integration Points

1. **IDE Integration**: Cursor editor integration via `.cursor/rules/`
2. **Git Integration**: Detects file changes with or without Git
3. **CI/CD Integration**: Can run in automation via JSON output options

## Testing Strategy

CheckMate employs a multi-layered testing approach:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test interactions between components
3. **Spec Tests**: The specs themselves serve as acceptance tests
4. **End-to-End Tests**: CLI interface testing with expected outcomes

## Performance Considerations

- **Context Building**: Uses efficient file scanning and relevance ranking
- **Caching**: Implements caching for model responses and file analysis
- **Concurrency**: Handles multiple spec executions with event handling

## Security Model

1. **API Keys**: Securely stored in `.checkmate` config (not versioned)
2. **Test Isolation**: Tests run in isolated environments
3. **File Access**: Limited to workspace boundaries by default

## Extension Points

1. **Custom Commands**: Add new commands in `src/commands/`
2. **Test Adapters**: Add support for additional testing frameworks
3. **MCP Providers**: Support for different AI model providers

## Common Workflows

### 1. Creating a New Feature

```
gen --feature "Feature description" → Create spec → Implement feature → Run tests → Update status
```

### 2. Interactive Spec Generation (ISG)

```
draft "Feature description" → Review JSON drafts → Edit as needed → save --json <edited> → Implement feature
```

This workflow separates generation from persistence, allowing for review and refinement before committing to disk.

### 3. Validating Implementation

```
status → Identify failing specs → Run affected specs → Fix issues → Rerun tests
```

### 4. Continuous Monitoring

```
watch → Implement features → See real-time pass/fail updates
```

### 5. Converting User Spec to Agent Spec

```
promote --spec "spec-name" → Edit YAML file → Add test code → Run tests
```

## Future Architecture Directions

1. **Web UI**: Visual dashboard for spec management
2. **Plugins**: Extensible plugin system for custom integrations
3. **Cloud Integration**: Remote spec execution and validation
4. **Team Collaboration**: Multi-user spec authoring and review 