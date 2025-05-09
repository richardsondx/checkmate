# PRD-Driven Workflow

CheckMate now supports a PRD-driven workflow that streamlines the process of generating and maintaining specs from Product Requirements Documents.

## Overview

The PRD-driven workflow follows these steps:

1. **Warmup** - Parse a PRD file and bootstrap specs
2. **Features** - View features discovered from the PRD 
3. **Audit** - Compare specs against code implementation

This workflow enables teams to maintain traceability from product requirements to implementation, ensuring that your code stays aligned with PRD specifications.

## Usage

### 1. From PRD to Specs

To generate specs from your PRD markdown file:

```bash
checkmate warmup docs/PRD.md
```

This command:
- Reads the PRD file and parses all H2 headings as features
- Extracts bullet lists under each heading as acceptance criteria
- Calls the AI to generate Markdown specs for each feature
- Saves specs to `checkmate/specs/<slug>.md`
- Stores the list of detected features in `.checkmate/last-warmup.json`

Each feature in your PRD becomes a CheckMate spec with a set of testable checks.

### 2. View Discovered Features

To see all features extracted from your PRD:

```bash
checkmate features
```

This displays a table with:
- Feature slugs (derived from H2 headings)
- Feature titles
- Feature types (USER/AGENT)
- Feature status (PASS/FAIL/STALE/UNKNOWN)
- Source (prd/spec/code/both)
- File count

### 3. Audit Implementation Against Specs

Once you've implemented a feature, audit it against its spec:

```bash
checkmate audit user-login-flow
```

This command:
- Finds the spec at `checkmate/specs/user-login-flow.md`
- Parses all check bullets under the `## Checks` section
- Extracts action bullets from related code files
- Compares spec bullets ↔ code bullets and prints:
  - ✅ Matched criteria (in both spec and code)
  - ❌ Spec-only bullets (requirements not yet implemented)
  - ⚠️ Code-only bullets (functionality not in spec)

The audit command exits with code 0 if all spec requirements are implemented, otherwise 1.

## PRD Requirements

For best results, structure your PRD with:

1. H2 headings for each feature:
   ```markdown
   ## User Authentication Flow
   ```

2. Bullet lists for acceptance criteria:
   ```markdown
   * Allow users to sign up with email and password
   * Support existing user login with validation
   * Enable password reset via email link
   ```

## Example PRD

```markdown
# Product Requirements

This document outlines the requirements for our application.

## User Authentication Flow

The application needs a secure login and registration process:

* Allow users to sign up with email and password
* Support existing user login with validation
* Enable password reset via email link
* Implement OAuth login via Google and GitHub

## Task Management

Users should be able to manage their tasks:

* Display tasks in a sortable list
* Allow adding new tasks with title and description
* Enable marking tasks as complete
* Support deleting unwanted tasks
```

## Advanced Options

### Warmup Options

```bash
# Skip interactive mode and save all specs
checkmate warmup docs/PRD.md --yes

# Output in a specific format
checkmate warmup docs/PRD.md --output json
```

### Features Options

```bash
# Filter features by search term
checkmate features --search auth

# Filter by type or status
checkmate features --type USER --status FAIL

# Output as JSON for programmatic use
checkmate features --json
```

### Audit Options

```bash
# Don't fail on differences, just warn
checkmate audit user-login-flow --warn-only

# Force regeneration of action bullets from code
checkmate audit user-login-flow --force

# Automatically add missing bullets to spec
checkmate audit user-login-flow --auto-sync
```

## Integration with Development Workflow

For the best results, incorporate the PRD-driven workflow into your development process:

1. **Planning Phase**:
   - Create or update the PRD for new features
   - Run `checkmate warmup docs/PRD.md` to generate specs

2. **Development Phase**:
   - Implement features according to specs
   - Run `checkmate audit <feature>` to track progress

3. **Review Phase**:
   - Run `checkmate features` to see overall status
   - Ensure all specs are passing before merge

4. **Maintenance Phase**:
   - When requirements change, update the PRD
   - Re-run `checkmate warmup docs/PRD.md` with `--force` to update specs 