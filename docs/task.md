# Task & Planning Workflow

This document explains how Magic SDD converts stable specifications into actionable implementation plans and atomic tasks.

## 1. Overview

The Task Workflow is the bridge between *Design* (what to build) and *Execution* (how to build it). It analyzes the dependency graph of all stable specifications and produces an optimized execution roadmap.

Key Goals:

- **Dependency Awareness**: Ensuring components are built in the correct logical order.
- **Phased Execution**: Breaking down large projects into manageable implementation phases.
- **Atomicity**: Decomposing features into individual tasks that can be completed in a single agent session.

## 2. The Planning System

Magic uses two primary files to manage project state:

- **`.design/PLAN.md`**: The high-level roadmap showing Phases, assigned Specifications, and their current status.
- **`.design/TASKS.md`**: The master index of all atomic implementation tasks across all phases.

## 3. Automation & Workflows

### 3.1 Dependency Analysis

When running `magic.task`, the engine reads all files in `.design/INDEX.md`, builds a directed acyclic graph (DAG) of dependencies, and identifies the "Critical Path."

### 3.2 Task Decomposition

The engine automatically breaks down each specification into 2-3 atomic tasks. Each task is assigned a unique ID (e.g., `[T-1A01]`) and mapped to a specific section of a spec file.

### 3.3 Selective Planning (C6)

The system distinguishes between **Draft** specs (sent to the Backlog) and **Stable** specs (candidates for the active plan).

## 4. Orchestration & Tracks

Tasks are organized into **Execution Tracks** (Track A, Track B, etc.).

- **Sequential Mode**: One agent works through tracks in order.
- **Parallel Mode**: Multiple agents work on independent tracks simultaneously, coordinated by a Manager Agent.

## 5. Maintenance

- **Plan Synchronization**: If specifications change, the plan and tasks must be updated via the "Sync tasks" command.
- **Archival (C8)**: Once a phase is completed, its detailed task file is moved to `.design/archives/tasks/` to keep the working area clean and efficient.

## 6. Pre-flight Checks

The Task workflow triggers a **Consistency Check** before running to ensure the plan is based on an accurate view of the project's current filesystem and specification registry.
