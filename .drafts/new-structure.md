# Структура проекта

Решил сделать серьёзную реструктуризацию проекта, пообщался на эту тему с ИИ, просмотри переписку, проанализируй написанное ниже и вынеси свой вердикт:

---

## Я (вопрос)

Можно ли sdd из текущего формата [.magic](file;file:///d%3A/Projects/src/github.com/teratron/magic-spec/.magic) / [skills](file;file:///d%3A/Projects/src/github.com/teratron/magic-spec/skills) / [rules](file;file:///d%3A/Projects/src/github.com/teratron/magic-spec/rules) сделать единый скилл, который будет например лежать в единой папке-скиле .agents\skills\magic-spec\ и можно было управлять из этого единого скилла разными командами-воркфлоу, например: /magicspec:task, /magicspec:run и т.д.?

## ИИ (ответ)

Да, **технологически и концептуально это абсолютно возможно**, и такой подход хорошо совпадает со стандартом **Agent Skills**.

Объединение распределенной структуры (`.magic/`, `skills/`, `rules/`, `workflows/`) в один автономный скилл (например, `.agents/skills/magicspec/`) делает SDD-движок изолированным и простым для переноса между проектами.

Ниже подробно описано, как устроен такой подход, как реализуются подкоманды и с какими особенностями придется столкнуться.

### 1. Архитектура единого скилла (`.agents/skills/magicspec/`)

Вместо рассеивания по корню проекта, все компоненты объединяются внутри папки скилла:

```text
.agents/skills/magicspec/
├── SKILL.md               # Main router & metadata (YAML frontmatter)
├── scripts/               # Engine scripts (executor.js, etc., formerly .magic/scripts)
├── workflows/             # Workflow definitions (spec.md, task.md, run.md, etc.)
├── rules/                 # SDD core rules (formerly rules/)
└── references/            # Additional specs, documentation, or schemas
```

### 2. Варианты управления подкомандами (`/magicspec:task`, `/magicspec:run`)

В современных AI IDE и спецификации Agent Skills имя скилла определяется файлом `SKILL.md` (поле `name:` в frontmatter). Для организации вызова разных подкоманд есть два основных подхода:

#### Вариант А. Единый скилл-диспетчер (Router Pattern)

В этом случае скилл называется `magicspec`. Вызов происходит через `/magicspec task`, `/magicspec run`, `@magicspec task` или простым промптом *"Magic Spec: execute task"*.

В `SKILL.md` описывается логика маршрутизации:

```markdown
---
name: magicspec
description: Specification-Driven Development (SDD) engine orchestrator.
---

# Magic Spec Router

Parse user intent or subcommand:
- `task` / `magicspec:task`: Load `workflows/task.md` and execute task breakdown.
- `run` / `magicspec:run`: Load `workflows/run.md` and execute pending tasks.
- `spec` / `magicspec:spec`: Load `workflows/spec.md` for spec management.
- `analyze` / `magicspec:analyze`: Load `workflows/analyze.md` for health check.

## Subcommand Execution
1. Read the target workflow from `workflows/<subcommand>.md`.
2. Follow workflow instructions and invoke `node scripts/executor.js <action>`.
```

#### Вариант Б. Единый скилл + точечные workflow-врапперы (для слэш-команд в UI)

Если важно иметь нативное автодополнение в UI IDE для команд с двоеточием или точкой (например `/magicspec:task` или `/magic.task`), создаются минимальные файлы в `.agents/workflows/`:

Файл `.agents/workflows/magicspec.task.md`:

```markdown
---
description: Execute SDD Task Workflow
---
Load and run instructions from `.agents/skills/magicspec/workflows/task.md`.
```

При этом вся тяжелая логика, скрипты и правила остаются внутри единой папки `.agents/skills/magicspec/`.

### 3. Сравнение подходов (Преимущества и нюансы)

#### Преимущества единого скилла

1. **Чистый корень проекта (Clean Root)**: Корень репозитория не захламляется служебными папками (`.magic`, `workflows`, `skills`, `rules`).
2. **Изоляция и портативность**: Чтобы добавить Magic Spec в любой другой проект, достаточно скопировать одну папку `.agents/skills/magicspec/` (или подключить через `skills.json`).
3. **Унификация с Agent Skills**: Логика скриптов хранится в `scripts/`, документация в `references/`, а правила в `rules/` — это полностью соответствует стандартной структуре скиллов.

#### Нюансы реализации

1. **Индексация слэш-команд**: В некоторых AI-агентах автодополнение слэш-команд регистрируется строго по имени скилла (один `SKILL.md` = одна команда `/magic-spec`). Для подкоманд потребуется либо передавать аргумент (`/magic-spec task`), либо использовать легкие workflow-врапперы из Варианта Б.
2. **Скрипты-исполнители (Executor Paths)**: Пути вызова Node.js скриптов изменятся с `node .magic/scripts/executor.js` на `node .agents/skills/magicspec/scripts/executor.js`.
3. **Целостность движка (C14/Checksums)**: Скрипт проверки целостности и версии движка должен будет рассчитывать чек-суммы файлов внутри папки скилла.

### 4. Резюме

Сделать SDD единым скиллом **можно и целесообразно**. Это сделает архитектуру более чистой и переносимой.

Если вы хотите сохранить красивые слэш-команды вида `/magicspec:task`, оптимальной является комбинированная схема: **вся логика и скрипты внутри `.agents/skills/magicspec/` + тонкие врапперы в `.agents/workflows/`**.

---

## Я (вопрос)

можно что 2 варианта в одном было "Вариант А. Единый скилл-диспетчер (Router Pattern)" и "Вариант Б. Единый скилл + точечные workflow-врапперы (для слэш-команд в UI)"?

## ИИ (ответ)

Да, **именно так и делают на практике** — эти два варианта не исключают, а идеально дополняют друг друга. Такой гибридный подход объединяет удобство UI и универсальность архитектуры.

### Как работает гибридная схема

```text
.agents/
├── skills/
│   └── magicspec/
│       ├── SKILL.md                 # [Вариант А] Единый роутер, точка входа и обработчик интентов
│       ├── scripts/                 # Node.js скрипты движка (executor.js и др.)
│       ├── workflows/               # Полные тексты воркфлоу (spec.md, task.md, run.md...)
│       └── rules/                   # SDD правила и ограничения
└── workflows/                       # [Вариант Б] Тонкие UI-врапперы для автодополнения
    ├── magicspec.spec.md            # Регистрирует /magicspec:spec
    ├── magicspec.task.md            # Регистрирует /magicspec:task
    ├── magicspec.run.md             # Регистрирует /magicspec:run
    └── magicspec.analyze.md         # Регистрирует /magicspec:analyze
```

### Как это работает на практике

#### 1. Вызов через автодополнение в UI (Вариант Б)

Когда пользователь начинает вводить `/magicspec:` в чате IDE, UI показывает всплывающий список с командами (`/magicspec:task`, `/magicspec:run` и т.д.).

При выборе `/magicspec:task` открывается тонкий файл `.agents/workflows/magicspec.task.md`:

```markdown
---
description: Execute SDD Task breakdown workflow
---
Delegate execution to `.agents/skills/magicspec/SKILL.md` with subcommand `task` (or directly load `.agents/skills/magicspec/workflows/task.md`).
```

#### 2. Прямой вызов скилла или естественный язык (Вариант А)

Если пользователь пишет:

- `@magicspec task`
- `/magicspec task`
- *"Обнови спеку через magicspec"*

Срабатывает основной `SKILL.md` (`.agents/skills/magicspec/SKILL.md`), который анализирует интент пользователя, определяет нужную подкоманду и подгружает соответствующий файл из внутренних `workflows/`.

### Почему гибридный подход — лучший выбор

1. **Максимальное удобство для пользователя**: Работают и слэш-команды в автодополнении IDE (`/magicspec:task`), и прямой вызов единого скилла (`@magicspec`).
2. **Zero Code Duplication**: Вся бизнес-логика, алгоритмы, инструкции и скрипты хранятся **в одном месте** — внутри `.agents/skills/magicspec/`.
3. **Легкие врапперы**: Файлы в `.agents/workflows/` содержат всего по 2–3 строчки прокси-текста, поэтому их легко генерировать автоматически при обновлении скилла.

---

## Я (вопрос)

а чтоб было в одной папке:

```text
.agents/skills/magicspec/
├── SKILL.md               # Main router & metadata (YAML frontmatter)
├── scripts/               # Engine scripts (executor.js, etc., formerly .magic/scripts)
├── workflows/             # Workflow definitions (spec.md, task.md, run.md, etc.)
├── rules/                 # SDD core rules (formerly rules/)
└── references/            # Additional specs, documentation, or schemas
```

без дополнительной папки ".agents/workflows/"?

## ИИ (ответ)

Да, **это будет работать отлично!**

Агент (LLM) сможет распознавать и выполнять все эти варианты вызова:

- `/magicspec:task`
- `/magicspec task`
- `/magicspec-task`
- `@magicspec task`

### Как это настраивается внутри `SKILL.md`

Чтобы роутер понимал двоеточие, в `SKILL.md` прописывается гибкое правило разбора команды (Pattern Matching):

```markdown
---
name: magicspec
description: Specification-Driven Development (SDD) engine orchestrator. Triggers: /magicspec:task, /magicspec:run, /magicspec:spec, /magicspec:analyze, /magicspec task.
---

# Magic Spec Engine Router

Parse the incoming user command or prompt using the following rules:

1. **Extract Action**:
   Normalize input matching patterns like `/magicspec:<action>`, `/magicspec <action>`, `@magicspec <action>`, or `magicspec:<action>`:
   - `/magicspec:task` or `/magicspec task` -> `task`
   - `/magicspec:run` or `/magicspec run` -> `run`
   - `/magicspec:spec` or `/magicspec spec` -> `spec`
   - `/magicspec:analyze` or `/magicspec analyze` -> `analyze`
   - `/magicspec:status` or `/magicspec status` -> `status`

2. **Load Target Workflow**:
   Read `.agents/skills/magicspec/workflows/<action>.md`.

3. **Execute**:
   Run the workflow instructions and associated automation in `scripts/executor.js`.
```

### Важный нюанс: Ручной ввод vs Автодополнение в UI IDE

1. **При ручном вводе текста в чат:** Если вы напишете в чат `/magicspec:task` или `/magicspec:run`, агент прочитает `SKILL.md`, распознает двоеточие, извлечет `task` или `run` и **без проблем выполнит нужный воркфлоу**.
2. **Выпадающий список автодополнения (когда вводите `/`):**
   - Если вам нужно, чтобы при вводе символа `/` всплывающее меню IDE **автоматически подсказывало** строчки `/magicspec:task`, `/magicspec:run`, то для этого в IDE обычно служат легкие файлы воркфлоу в папке `.agents/workflows/`.
   - Если автодополнение в меню не критично (и вы готовы вводить `/magicspec:task` или `/magicspec task` вручную), то папку `.agents/workflows/` можно вовсе **не создавать** — все будет работать из одной папки `.agents/skills/magicspec/`.

---

## Предложение по данному вопросу

С учётом выводов, которые ты сделаешь после прочитанной переписки и если вердикт будет положительным и соответсвовать прочитанному, то рассмотри предложенное мною дерево обновлёного проекта (будут замечания или вопросы для уточнения, спрашивай):

```text
magic-spec/
├── .agents/                      # или ./.claude/, или ./.codex/ в зависимости от того каким ИИ пользуемся
│   └── skills/
│       ├── magicspec/            # [DEV] хардлинк на ./skills/magicspec/
│       └── magicspec-dev/        # [DEV] хардлинк на ./skills/magicspec-dev/
├── .magicspec/                   # [DEV] бывшая ./.design/
│   ├── .cache/
│   ├── graph/                    # всё что касается графа помещается
│   │   ├── .cache/               # бывшая ./.design/.graph-cache/
│   │   ├── wiki/                 # бывшая ./.design/wiki/, TODO: wiki - относится к graph?
│   │   ├── graph.html            # бывшая ./.design/spec-graph.html
│   │   └── before.json           # бывшая ./.design/graph-before.json
│   └── ...
├── ...
├── docs/                         # [DEV]
│   ├── ...
│   └── migration.md              # инструкция по миграции со старой версии, если будет такая необходимости (под вопросом)
├── scripts/                      # [DEV] бывшая ./dev/scripts/
├── tests/                        # [DEV] бывшая ./dev/tests/
├── skills/
│   ├── magicspec/                # [PROD]
│   │   ├── roles/                # примечание: надо продумать где должна лежать папка "roles", вариант в корне ./skills/magicspec/roles/ или положить в "workflows" -> ./skills/magicspec/workflows/roles/
│   │   ├── rules/                # SDD core rules (formerly rules/)
│   │   ├── scripts/              # Engine scripts (executor.js, etc., formerly .magic/scripts)
│   │   ├── workflows/            # Workflow definitions (spec.md, task.md, run.md, etc.)
│   │   │   └── roles/            # примечание: возможный вариант расположения папки "roles" (читать выше комментарий к ./skills/magicspec/roles/)
│   │   ├── references/           # Additional specs, documentation, or schemas
│   │   ├── templates/
│   │   ├── .checksums
│   │   ├── .version
│   │   ├── RULES.md              # примечание: необходимость этого файла зависит от необходимости папки ./skills/magicspec/rules/, это бывшая ./rules/magic.md (надо продумать, как ИИ будет цеплять его и держать в памяти, может при первом запуске (инициализации) magicspec, например в AGENTS.md, или CLAUDE.md, или CODEX.md, будет добавляться правило)
│   │   ├── SKILL.md
│   │   └── README.md             # краткое описание, инструкция
│   └── magicspec-dev/            # [DEV]
│       ├── scripts/              # Engine scripts
│       ├── workflows/            # Workflow definitions
│       │   ├── init.md           # бывшая ./.agents/skills/magic-dev-init/, или ./.claude/skills/magic-dev-init/, или ./.codex/skills/magic-dev-init/
│       │   ├── release.md        # бывшая ./.agents/skills/magic-dev-release/, или ./.claude/skills/magic-dev-release/, или ./.codex/skills/magic-dev-release/
│       │   ├── test.md           # бывшая ./.agents/skills/magic-dev-simulate/, или ./.claude/skills/magic-dev-simulate/, или ./.codex/skills/magic-dev-simulate/
│       │   └── sync.md           # бывшая ./.agents/skills/magic-dev-sync/, или ./.claude/skills/magic-dev-sync/, или ./.codex/skills/magic-dev-sync/
│       ├── references/           # Additional specs, documentation, or schemas
│       └── SKILL.md
├── ...
├── package.json                  # [DEV]
├── AGENTS.md                     # [DEV] или CLAUDE.md, или CODEX.md в зависимости от того каким ИИ пользуемся
└── README.md                     # [DEV]
```
