# Onboarding & Tutorial Workflow

This document explains the interactive onboarding process for new developers and AI agents.

## 1. Overview

The Onboarding Workflow is an interactive tutorial building a toy "Logger Module". It is designed to teach the full Magic SDD lifecycle through a hands-on exercise.

Key Goals:

- **Interactive Learning**: Hands-on experience with Specifications, Plans, and Tasks.
- **Workflow Discovery**: Demonstrating how the engine files and scripts work together.
- **Safety**: Ensuring the tutorial doesn't interfere with real production work.

## 2. Interactive Pacing (Wait Gates)

The onboarding process is structured into discrete, manageable steps. To ensure the user has time to absorb the concepts, the agent is strictly mandated to **Wait** for user confirmation (e.g., "ready", "ok", "да") after completing each step before proceeding to the next.

1. **Introduction**: Explaining the "Spec-First" philosophy and cross-platform architecture.
2. **The Toy Spec**: Creating a simple "console logger" specification.
3. **Registration**: Adding the spec to `INDEX.md`.
4. **Planning**: Generating a dependency-aware `PLAN.md`.
5. **Execution**: Decomposing the plan into tasks in `TASKS.md` and "simulating" implementation.
6. **Closing**: Demonstrating the retrospective and archival processes.

## 3. Automation & Safety Guards

### 3.1 Production Safety (Collision Guard)

Before starting the tutorial, the engine performs a mandatory scan:

- **Collision Detection**: It checks for existing specifications in `.design/specifications/`.
- **Safety HALT**: If any non-tutorial specifications are found (>0 files), the workflow will **HALT** to prevent accidental corruption of production data.
- **Options**: The user is offered to either **Backup** the current design folder or **Cancel** the onboarding.

### 3.2 Wipe Protocol

If the tutorial is restarted, the engine only deletes tutorial-specific files (e.g., `logger-module.md` and toy plans). It will never format or delete the entire `.design/` directory.

### 3.3 Simulation Mode

Unlike the production workflows, the onboarding workflow **simulates** execution during the final stage. It updates metadata and status fields without writing real implementation code, focusing purely on the SDD logic.

## 4. Maintenance

- **Tutorial Sandbox**: It is highly recommended to run the onboarding workflow in a clean, empty directory.
- **Concept Reinforcement**: Every step in the tutorial reinforces the core SDD belief: **"No code without spec; no spec without plan."**
- **Engine Evolution**: The onboarding guide is updated whenever significant changes are made to the core engine logic (v1.4.x+).

## 5. Security Note

While onboarding creates real files, it is isolated from the production logic. It serves as an educational bridge to the full `magic.run` and `magic.spec` workflows.
