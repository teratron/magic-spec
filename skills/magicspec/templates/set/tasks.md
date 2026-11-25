# M{n} — {milestone title}: tasks on {stack}

<!-- Written when the milestone is next. The pack of a task is computed from these fields; nothing else is read. A produced unit uses only names produced by then, and every test under Observe passes with the work of its task and of the tasks it is After. A task whose work no later task of the milestone uses writes `Produces: —`. A test file a task extends was created by an earlier task, which this one is After, and is named in Creates as `{file} (extends M{n}.T{k})`, the address being that of the creating task. A Done when whose observation runs a command states the exit status in its expected result, e.g. "exits 0 and prints …". -->

## M{n}.T{k} — {title}

- Goal: {one sentence}
- Priority: {must | should | could}
- After: {task addresses, or —}
- Builds: {component key}
- Consumes: {addresses of behaviour and binding units this task uses from earlier work}
- Context: {other addresses: units to realize, rules, decisions, map entries}
- Produces: {binding unit address, or `exact name and signature`} → {task address that uses it}; … — or — for work no later task of this milestone uses
- Creates: {files, modules, interface items — and the task's test files, in the place the stack profile names for tests; an earlier task's test file this one extends as `{file} (extends M{n}.T{k})`}
- Done when: {observable check with its expected result} — Observe: {test | example | command}; …
