# PRD-Driven Workflow with LLM-TDD

CheckMate supports a PRD-driven workflow that streamlines the process of generating initial specs from Product Requirements Documents, which then feed into an LLM-driven Test-Driven Development cycle.

## Overview

The PRD-driven workflow combined with LLM-TDD follows these steps:

1.  **Warmup**: Parse a PRD file and bootstrap initial Markdown specs for each feature.
2.  **Features**: View features discovered from the PRD and their current status.
3.  **LLM-TDD Cycle (Triggered in Cursor)**:
    *   The user instructs an LLM (e.g., Cursor) to work on a feature (e.g., `/@checkmate-tdd <feature-slug>`).
    *   A Cursor rule (`checkmate-feature-validation-workflow.mdc`) activates.
    *   The rule calls `checkmate list-checks --spec <feature-slug>` to get the checklist.
    *   The LLM receives the checks and instructions to:
        *   Define success/failure conditions for each check.
        *   Implement or verify the code for that check.
        *   Formulate an outcome report.
        *   Call `checkmate verify-llm-reasoning --spec <slug> --check-id <id> ...` with its conditions and report.
    *   CheckMate validates the LLM's reasoning and updates the spec file.
    *   The LLM uses feedback to proceed or self-correct.
4.  **Status**: Check the overall status of the spec using `checkmate status --target <feature-slug>`.

This workflow enables teams to maintain traceability from product requirements to implementation, ensuring that code stays aligned with PRD specifications, with the LLM actively participating in the TDD loop.

## Usage

### 1. From PRD to Initial Specs

To generate initial specs from your PRD markdown file:

```bash
checkmate warmup docs/PRD.md
```

This command:
- Reads the PRD file.
- Uses AI to identify features and their corresponding checks.
- Generates Markdown specs for each feature in `checkmate/specs/<slug>.md`.
- Stores the list of detected features in `.checkmate/last-warmup.json`.

Each feature in your PRD becomes a CheckMate spec with a set of testable checks, ready for the LLM-TDD cycle.

### 2. View Discovered Features

To see all features extracted from your PRD (and their current status):

```bash
checkmate features
```

### 3. Initiate LLM-TDD Cycle

In your AI coding assistant (e.g., Cursor), instruct it to start the TDD process for a feature:

```
/@checkmate-tdd user-authentication-flow
```

This will trigger the `checkmate-feature-validation-workflow.mdc` rule, which guides the LLM through the `list-checks` and `verify-llm-reasoning` cycle for each check in the `user-authentication-flow.md` spec.

The LLM will interact with these commands, implement/verify code, and update the spec statuses based on validated reasoning.

### 4. Check Final Status

After the LLM has processed all checks for a feature:

```bash
checkmate status --target user-authentication-flow
```

This shows the final pass/fail status of all checks for that spec.

## PRD Requirements

For best results with `checkmate warmup`, structure your PRD with clear feature delineations and acceptance criteria. For example:

1.  H2 or H3 headings for each feature:
    ```markdown
    ## User Authentication Flow
    ```

2.  Bullet lists for acceptance criteria/checks under each feature:
    ```markdown
    * Allow users to sign up with email and password.
    * Support existing user login with validation.
    * Enable password reset via email link.
    ```

## Advanced Options

Refer to the main README and command help (`checkmate <command> --help`) for advanced options for `warmup`, `features`, `list-checks`, and `verify-llm-reasoning`.

## Integration with Development Workflow

1.  **Planning Phase**:
    *   Create or update the PRD for new features.
    *   Run `checkmate warmup docs/PRD.md` to generate/update initial specs.

2.  **Development Phase (with LLM/Cursor)**:
    *   For each feature, trigger the TDD workflow: `/@checkmate-tdd <feature-slug>`.
    *   The LLM iterates through checks, implementing code and using `verify-llm-reasoning`.

3.  **Review Phase**:
    *   Use `checkmate features` and `checkmate status --target <feature-slug>` to see overall status.
    *   Ensure all specs are passing before merge.

4.  **Maintenance Phase**:
    *   When requirements change, update the PRD and the corresponding Markdown spec file(s).
    *   Re-run the LLM-TDD cycle for affected features if significant changes were made to the spec structure or if `warmup` is used to refresh specs.

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