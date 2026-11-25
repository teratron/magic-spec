# M{n} — {milestone title}: tasks on {stack}

<!-- Written when the milestone is next. The pack of a task is computed from these fields; nothing else is read. A produced unit uses only names produced by then, and every test under Observe passes with the work of its task and of the tasks it is After. A task whose work no later task of the milestone uses writes `Produces: —`. A binding unit is built by exactly one task; a unit too large for one task is split into units before the tasks are written. A file a task extends, source or test, was created by an earlier task, which this one is After, directly or not, and is named in Creates as `` `{file}` (extends M{n}.T{k}) ``, the path alone in the code span, the address being that of the creating task. Context lists the stack rules that govern the task, and a neutral rule only where no stack rule of its stack realizes it. A Done when whose observation runs a command states the exit status in its expected result, e.g. "exits 0 and prints …". -->

## M{n}.T{k} — {title}

- Goal: {one sentence}
- Priority: {must | should | could}
- After: {task addresses, or —}
- Builds: {component key}
- Consumes: {addresses of behaviour and binding units this task uses from earlier work}
- Context: {other addresses: units to realize, the stack rules that govern the task (a neutral rule only where no stack rule realizes it), decisions, map entries}
- Produces: {binding unit address, or `exact name and signature`} → {task address that uses it}; … — or — for work no later task of this milestone uses
- Creates: {files, modules, interface items — and the task's test files, in the place the stack profile names for tests; an earlier task's file this one extends, source or test, as `` `{file}` (extends M{n}.T{k}) ``}
- Done when: {observable check with its expected result} — Observe: {test | example | command}; …
