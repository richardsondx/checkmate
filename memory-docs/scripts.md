# Executing Packaged Scripts in CheckMateAI

This document outlines the best practice for executing scripts that are packaged with the `checkmateai` tool, particularly when these scripts are called from within CheckMateAI rules or by other tools that depend on `checkmateai`.

## Preferred Method: `checkmate run-script`

When you need to execute a script that is part of the `checkmateai` package (e.g., scripts located in its internal `scripts/` directory), you **MUST** use the `checkmate run-script` command.

**Syntax:**

```bash
checkmate run-script <script-name> [args...]
```

-   `<script-name>`: The name of the script file (without the `.js` extension) located in `checkmateai`'s internal `scripts` directory.
-   `[args...]`: Any arguments that need to be passed to the script.

**Examples:**

1.  Running the `fix-check-format` script on a specific spec file:
    ```bash
    checkmate run-script fix-check-format "path/to/your-spec.md"
    ```

2.  Running the `cm-spec-drift` script:
    ```bash
    checkmate run-script cm-spec-drift "path/to/source-file.js"
    ```

3.  Running a script without arguments:
    ```bash
    checkmate run-script validate-all-specs
    ```

## Rationale

Using `checkmate run-script` is crucial for ensuring that scripts are correctly located and executed, especially in scenarios where `checkmateai` is installed as a dependency in another project (e.g., inside a `node_modules` folder).

**Why avoid direct `node scripts/...` calls?**

If a rule or an external tool tries to call a packaged script directly using a relative path like `node scripts/fix-check-format.js`, the Node.js runtime will look for the `scripts` directory relative to the *current working directory* of the host project. This will lead to "Cannot find module" errors if `checkmateai` is a dependency, because the `scripts` folder is within `node_modules/checkmateai/scripts/` and not at the root of the host project.

The `checkmate run-script` command is designed to:
1.  Correctly resolve the path to `checkmateai`'s internal `scripts` directory, regardless of where `checkmateai` is installed.
2.  Execute the specified script using the appropriate Node.js environment managed by `checkmateai`.

## Implications for Rule Development

When writing CheckMateAI rules (`.mdc` files) that need to invoke packaged scripts:
-   **ALWAYS** use `checkmate run-script <script-name>`.
-   **NEVER** use `node scripts/<script-name>.js` or any other relative path invocation that assumes the script is in the host project's root.

**Example in a rule:**

```
# Incorrect:
# node scripts/fix-check-format.js "$SPEC_FILE"

# Correct:
checkmate run-script fix-check-format "$SPEC_FILE"
```

## Handling `npm run` scripts

If `checkmateai`'s `package.json` defines scripts (e.g., `npm run lint-specs`), and these are intended to be called from rules or by consumers of `checkmateai`, it is generally better to expose this functionality through a dedicated `checkmate` command or a `checkmate run-script` alias if possible.

Relying on `npm run ...` from within rules can also lead to path resolution issues when `checkmateai` is a dependency, as `npm run` executes scripts defined in the `package.json` of the current project, which might not be the `checkmateai` package itself.

By adhering to the `checkmate run-script` convention, we ensure that script execution remains robust and reliable across different project setups and usage contexts. 