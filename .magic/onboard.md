---
description: Interactive tutorial to learn the Magic SDD lifecycle.
---

# Magic SDD Onboarding (Interactive Tutorial)

An interactive walkthrough of the full Magic SDD lifecycle. Builds a toy "logger module" specification from scratch to give the user hands-on experience with every workflow stage.

> **This is a tutorial workflow.** It creates real files in your project directory.
> For production use, run this in a **clean, empty directory**.

## Agent Guidelines

**CRITICAL INSTRUCTIONS FOR AI:**

1. **Instructor Role**: Act as a friendly, encouraging SDD instructor throughout. Keep explanations short and concrete.
2. **Step-by-Step Pacing**: Complete each step fully, then **explicitly wait** for the user to confirm before proceeding to the next step. Never skip ahead.
3. **No Implementation Code**: This is a specification tutorial. Do not write implementation code (Rust, JS, Python, etc.) at any point.
4. **Safe Simulation**: When "executing" a task in Step 5, simulate the outcome by updating status fields only. Do not write real code.
5. **Sandbox Warning**: Remind the user at the start that real files will be created. If an existing `.design/` is detected, warn before writing.

## ⚠️ Safety Notice

This tutorial will create real files in your project:

- `.design/specifications/logger-module.md`
- `.design/INDEX.md` (appended)
- `.design/PLAN.md`
- `.design/tasks/TASKS.md`
- `.design/tasks/phase-1.md`

**Recommended**: run this in a clean, empty directory to avoid interfering with existing SDD artifacts.

---

## Workflow Steps

### Step 1: Introduction

1. Introduce yourself as the Magic SDD onboarding guide.
2. Explain the core philosophy in one sentence: *"No code is written until a specification exists, and no spec is implemented without a plan."*
3. Invite the user to create their very first Magic specification: a toy "console logger" module.
4. Tell the user to type `ready` to begin.
5. **Wait for user confirmation.**

### Step 2: The Toy Spec

1. Tell the user you are creating a toy specification.
2. Create the file `.design/specifications/logger-module.md`.
3. The specification should contain:
   - **Overview**: A simple console logger.
   - **Detailed Design**: A class with `info(msg)`, `warn(msg)`, and `error(msg)` methods.
   - **Status**: Stable.
4. Explain that specs normally start as `Draft`, advance to `RFC` for review, and become `Stable` when approved. For this tutorial, we skipped straight to `Stable`.
5. Tell the user to type `continue` to proceed to registration.
6. **Wait for user confirmation.**

### Step 3: Registration in INDEX.md

1. Explain that for the system to recognize a spec, it must be registered in the central index.
2. Add `logger-module.md` to `.design/INDEX.md` with status `Stable`.
3. Confirm to the user that the system now recognizes the spec.
4. Tell the user: *"Next, we generate a Plan. Type `plan` to calculate the dependency graph and create the plan."*
5. **Wait for user confirmation.**

### Step 4: Mini PLAN.md

1. Explain that normally, the `magic.plan` workflow scans all stable specs and calculates a critical path.
2. Generate a minimal `.design/PLAN.md` with a single Phase 1 containing the `logger-module.md` feature.
3. Show the user a small preview of the plan.
4. Tell the user: *"Now we decompose this plan into atomic tasks. Type `task` to generate tasks."*
5. **Wait for user confirmation.**

### Step 5: Atomic Task and Execution

1. Explain that normally, `magic.task` breaks down plan phases into parallel tracks and individual steps.
2. Create `.design/tasks/TASKS.md` with 1 total task for Phase 1.
3. Create `.design/tasks/phase-1.md` with a single track and a single task `[T-1A01] Implement console logger`.
4. Simulate execution by changing the task status to `Done` and updating the TASKS.md count.
5. Explain what happened: *"The task was implemented and the system marked it Done. In the real workflow, this is where code gets written."*

### Step 6: Conclusion

1. Conclude the tutorial.
2. Explain the retrospective: *"Completing a phase triggers an auto-snapshot. Completing the full plan triggers a Level 2 retrospective. The SDD engine continuously learns from your bottlenecks."*
3. Point the user to the next step: *"Ready for real work? Describe your first idea and it will be converted into a specification."*
4. End the tutorial.
