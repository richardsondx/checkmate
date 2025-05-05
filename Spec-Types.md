# Spec Types

CheckMate supports two types of specifications that serve different purposes and offer different capabilities.

| Type | File Format | Dashboard Label | Created By | Purpose |
|------|-------------|-----------------|------------|---------|
| **User Specs** | `.md` | USER | You or your team | Natural language requirements for humans to write and AI to evaluate |
| **Agent Specs** | `.yaml` | AGENT | AI assistants | Specifications that include executable test code |

## User Specs (Markdown)

User Specs are the simplest and most human-friendly way to create specifications. They use Markdown format and are primarily intended for human readability and AI evaluation.

Example User Spec:

```markdown
# User Authentication

files:
  - src/auth/login.ts
  - src/components/LoginForm.tsx

- [ ] Display error message when login fails
- [ ] Passwords must be at least 8 characters
- [ ] Store JWT token in localStorage after successful login
- [ ] Redirect to dashboard after successful login
- [ ] Clear form fields on failed login attempt
```

### When to use User Specs

User Specs are ideal when:
- You're new to CheckMate and want to get started quickly
- The requirements are simple and easy to understand
- You want to maintain specs that are easy for everyone to read and edit
- You're working with non-technical stakeholders who need to review specs

User Specs are evaluated by AI, which examines your code to determine if each requirement has been implemented correctly.

## Agent Specs (YAML)

Agent Specs use a structured YAML format that includes executable tests. They're more precise and can validate functionality programmatically.

Example Agent Spec:

```yaml
title: User Authentication
files:
  - src/auth/login.ts
  - src/components/LoginForm.tsx
requirements:
  - id: req-1
    require: Display error message when login fails
    test: |
      import { render, fireEvent } from '@testing-library/react';
      import LoginForm from './src/components/LoginForm';
      
      const { getByText, getByLabelText } = render(<LoginForm />);
      fireEvent.change(getByLabelText('Email'), { target: { value: 'test@example.com' } });
      fireEvent.change(getByLabelText('Password'), { target: { value: 'wrong' } });
      fireEvent.click(getByText('Log In'));
      
      // Check if error message appears
      const errorMsg = await waitFor(() => getByText('Invalid credentials'));
      if (!errorMsg) throw new Error('Error message not displayed');
```

### When to use Agent Specs

Agent Specs are ideal when:
- You need more precise validation
- You want tests that can run without AI (e.g., in CI pipelines)
- You're validating complex functionality like database operations or API calls
- You want to verify specific edge cases

Agent Specs contain executable JavaScript/TypeScript code that runs in a sandbox to validate your implementation.

## Converting Between Spec Types

You can convert from User Specs to Agent Specs using the `promote` command:

```bash
checkmate promote --to-agent user-authentication
```

This converts a Markdown spec to a YAML spec with executable test stubs. You'll need to fill in the test code for each requirement.

## The Mini-DSL for Agent Specs

Agent Specs support a simplified testing syntax called the CheckMate Test Script (CTS) Mini-DSL:

```
http GET /api/todos => 200 AS resp
assert resp.body.length >= 1
db todo.count => >= 1
```

**Verbs in the Mini-DSL:**

| Verb | Usage |
|------|-------|
| `http GET/POST` | Test endpoints (`WITH {json}` payload) |
| `db`            | Query DB helpers (`todo.count`, `todo.find`) |
| `file`          | File existence or content checks |
| `exec`          | Shell command check |
| `assert`        | Raw JS boolean expression |

## Hybrid Specifications

You can embed test code directly inside Markdown specs for a hybrid approach:

```markdown
- [ ] User can create a new todo item

```checkmate
http POST /api/todos WITH {"title":"test todo"} => 201 AS resp
assert resp.body.title == "test todo"
```
```

Convert a regular Markdown spec to hybrid format:

```bash
checkmate hybridize --spec user-todo-list
```

## Best Practices

- **Start with User Specs**: Begin with simple Markdown specs to get comfortable with CheckMate
- **Be specific**: Write clear, testable requirements that can be verified objectively
- **Focus on behavior**: Describe what the feature should do, not how it should be implemented
- **Use Agent Specs for complex validation**: Convert to Agent Specs when you need precise validation
- **Keep requirements atomic**: Each requirement should test one thing only

## Next Steps

- [Command Reference](Command-Reference.md) - Learn all available commands
- [Advanced Features](Advanced-Features.md) - Learn about power user features
- [Cursor Integration](Cursor-Integration.md) - Configure Cursor integration 