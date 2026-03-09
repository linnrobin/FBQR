# CLAUDE.md

This file provides guidance for AI assistants (Claude Code and similar tools) working in this repository.

## Project Overview

**FBQR** is a project by Robin (robinsalim@yahoo.com), licensed under the MIT License (copyright 2026).

The repository is currently in its initialization phase — only a README and LICENSE exist. No source code, dependencies, or build configuration have been added yet. This file should be updated as the project grows.

## Repository State (as of 2026-03-09)

```
FBQR/
├── LICENSE          # MIT License
├── README.md        # Project title only
└── CLAUDE.md        # This file
```

## Git Configuration

- **Remote:** `http://local_proxy@127.0.0.1:35046/git/linnrobin/FBQR`
- **Default branch:** `master`
- **Author:** Robin <robinsalim@yahoo.com>

### Branch Conventions

- Claude-managed branches follow the pattern: `claude/<task-slug>-<session-id>`
- Always develop on the designated feature branch; never push directly to `master` without explicit permission
- Push commands: `git push -u origin <branch-name>`

## Development Workflows

Since the project has no source code yet, the following are general conventions to establish as code is added:

### Getting Started

1. Clone the repository
2. Install dependencies (add setup instructions here once a tech stack is chosen)
3. Run the project (add run instructions here)

### Making Changes

1. Create or switch to the appropriate feature branch
2. Make changes
3. Commit with a clear, descriptive message
4. Push to the remote: `git push -u origin <branch-name>`

### Commit Message Style

Use concise, imperative commit messages:
- `Add feature X`
- `Fix bug in Y`
- `Update Z configuration`

## Key Conventions

- License: MIT — all contributions fall under the same license
- No `.gitignore` exists yet; add one appropriate to the chosen tech stack before committing generated artifacts or secrets

## Updating This File

As the project evolves, update this file to reflect:
- The chosen technology stack and dependencies
- Build, test, and lint commands
- Project architecture and directory structure
- Any important conventions or patterns used in the codebase
