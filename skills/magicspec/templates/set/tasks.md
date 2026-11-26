# M{n} — {milestone title}: tasks on {stack}

<!-- A document written from this template keeps none of its comments. Written when the milestone is next. The pack of a task is computed from these fields; nothing else is read. A produced unit uses only names produced by then, and every test under Observe passes with the work of its task and of the tasks it is After. A task whose work no later task of the milestone uses writes `Produces: —`. A binding unit is built by exactly one task. Before the tasks of a milestone are written, a unit too large for one task and a unit the milestone needs only in part are split: the unit keeps its address for the part built first, each other part takes a new address of its component, and its text, `Defines`, `Realizes` and `Accept` are divided between them. After its arrow `Produces` names every task of the milestone that uses the unit, separated by commas; a unit that defines no name is produced only to a task that extends the file it pins, and that task lists it in `Consumes`. A file a task extends, source or test, was created by an earlier task, which this one is After, directly or not, and is named in Creates as `` `{file}` (extends M{n}.T{k}) ``, the path alone in the code span, the address being that of the creating task. Context lists the stack rules that govern the task, and a neutral rule only where no stack rule of its stack realizes it. A Done when whose observation runs a command states the exit status in its expected result, e.g. "exits 0 and prints …". -->

## M{n}.T{k} — {title}

- Goal: {one sentence}
- Priority: {must | should | could}
- After: {task addresses, or —}
- Builds: {component key}
- Consumes: {addresses of behaviour and binding units this task uses from earlier work}
- Context: {other addresses: units to realize, the stack rules that govern the task (a neutral rule only where no stack rule realizes it), decisions, map entries}
- Produces: {binding unit address, or `exact name and signature`} → {the addresses of every task that uses it, separated by commas}; … — or — for work no later task of this milestone uses
- Creates: {files, modules, interface items — and the task's test files, in the place the stack profile names for tests; an earlier task's file this one extends, source or test, as `` `{file}` (extends M{n}.T{k}) ``}
- Done when: {observable check with its expected result} — Observe: {test | example | command}; …
