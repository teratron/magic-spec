# M{n} — {milestone title}: tasks on {stack}

<!-- Written when the milestone is next. The pack of a task is computed from these fields; nothing else is read. A produced unit uses only names produced by then, and every test under Observe passes with the work of its task and of the tasks it is After. -->

## M{n}.T{k} — {title}

- Goal: {one sentence}
- Priority: {must | should | could}
- After: {task addresses, or —}
- Builds: {component key}
- Consumes: {addresses of behaviour and binding units this task uses from earlier work}
- Context: {other addresses: units to realize, rules, decisions, map entries}
- Produces: {binding unit address, or `exact name and signature`} → {task address that uses it}; …
- Creates: {files, modules, interface items — and the task's test files, in the place the stack profile names for tests}
- Done when: {observable check with its expected result} — Observe: {test | example | command}; …
