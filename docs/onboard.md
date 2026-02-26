# Onboarding & Tutorial Workflow

This document explains the interactive onboarding process for new developers and AI agents.

## 1. Overview

The Onboarding Workflow is an interactive tutorial designed to teach the full Magic SDD lifecycle. It guides a user or agent through the creation of a "toy" project to demonstrate every stage of the workflow.

Key Goals:

- **Interactive Learning**: Hands-on experience with Specifications, Plans, and Tasks.
- **Workflow Discovery**: Demonstrating how the engine files and scripts work together.
- **Safety**: Ensuring the tutorial doesn't interfere with real production work.

## 2. Interactive Pacing

The onboarding process is structured into discrete, manageable steps:

1. **Introduction**: Explaining the "Spec-First" philosophy and cross-platform architecture.
2. **The Toy Spec**: Creating a simple "console logger" specification.
3. **Registration**: Adding the spec to `INDEX.md`.
4. **Planning**: Generating a dependency-aware `PLAN.md`.
5. **Execution**: Decomposing the plan into tasks in `TASKS.md` and "simulating" implementation.
6. **Closing**: Demonstrating the retrospective and archival processes.

## 3. Automation & Workflows

### 3.1 Pre-flight Safety Check

Before starting, the `magic.onboard` workflow checks for an existing `.design/` directory. If found, it warns the user to avoid overwriting production data.

### 3.2 Simulation Mode

Unlike the production workflows, the onboarding workflow **simulates** execution. It updates metadata and status fields without writing real implementation code, focusing purely on the SDD logic.

## 4. Maintenance

- **Tutorial Sandbox**: It is highly recommended to run the onboarding workflow in a clean, empty directory.
- **Engine Evolution**: The onboarding guide is updated whenever significant changes are made to the core engine logic or script execution patterns.

## 5. Security Note

While onboarding creates real files, it is isolated from the production logic. It serves as an educational bridge to the full `magic.run` and `magic.spec` workflows.
