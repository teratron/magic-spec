# magic-spec — Node.js инстоллер

Инстоллер `magic-spec` для npm/npx. Устанавливает систему Specification-Driven Development (SDD) в любой проект.

---

## Быстрый старт

Запустите в корне вашего проекта:

```bash
npx magic-spec@latest
```

Больше ничего устанавливать не нужно. `npx` скачает последнюю версию и мгновенно запустит установку.

---

## Что делает инстоллер

После выполнения команды в вашем проекте появятся:

```plaintext
ваш-проект/
│
├── .magic/                     # Движок SDD (не трогать вручную)
│   ├── onboard.md
│   ├── retrospective.md
│   ├── rule.md
│   ├── run.md
│   ├── spec.md
│   ├── task.md
│   └── scripts/
│       ├── check-prerequisites.* # Проверки для --doctor
│       ├── generate-context.*    # Сборка CONTEXT.md
│       ├── init.sh             # Скрипт инициализации (macOS/Linux)
│       └── init.ps1            # Скрипт инициализации (Windows)
│
├── .agent/workflows/           # Точки входа для AI-агентов (Cursor, Claude и др.)
│   ├── magic.onboard.md
│   ├── magic.rule.md
│   ├── magic.run.md
│   ├── magic.spec.md
│   └── magic.task.md
│
└── .design/                    # Ваше рабочее пространство (создаётся при инициализации)
    ├── INDEX.md                # Реестр спецификаций
    ├── RULES.md                # Конституция проекта
    └── specifications/         # Здесь будут ваши спецификации
```

---

## Параметры командной строки

### Установка движка (по умолчанию)

```bash
npx magic-spec@latest
```

Устанавливает `.magic/` и весь `.agent/` (полный набор адаптеров).

### Выбор конкретного окружения (адаптера)

Если вы хотите установить адаптер только для конкретного AI-агента, укажите флаг `--env`:

```bash
# Только для Cursor
npx magic-spec@latest --env cursor

# Только для Claude
npx magic-spec@latest --env claude

# Только для Gemini
npx magic-spec@latest --env gemini

# Несколько окружений сразу
npx magic-spec@latest --env cursor --env claude
```

### Обновление движка

Обновляет `.magic/` до последней версии, **не затрагивая** `.design/` (ваши спеки, планы, задачи):

```bash
npx magic-spec@latest --update
```

### Проверка здоровья проекта (Doctor)

Запускает скрипт валидации без AI-агента. Проверяет наличие обязательных файлов, состояние `INDEX.md` и спецификаций:

```bash
npx magic-spec@latest --doctor
```

### Справка

```bash
npx magic-spec@latest --help
```

---

## Требования

| Инструмент | Минимальная версия |
| :--- | :--- |
| Node.js | >= 16 |
| npm | >= 7 |

---

## Совместимость с AI-агентами

Работает с любым AI-агентом, который умеет читать markdown-файлы:

| Агент | Статус |
| :--- | :--- |
| [Cursor](https://cursor.sh) | ✅ Полная поддержка |
| [Claude](https://claude.ai) | ✅ Полная поддержка |
| [Gemini](https://gemini.google.com) | ✅ Полная поддержка |
| [GitHub Copilot](https://github.com/features/copilot) | ✅ Полная поддержка |
| Любой агент с поддержкой Markdown | ✅ |

---

## Структура инстоллера (для разработчиков)

```plaintext
project-root/
│
├── package.json    # Конфигурация npm-пакета (в корне)
│
└── installers/node/
    ├── index.js        # CLI-скрипт: точка входа пакета
    └── publish.js      # Скрипт публикации
```

### Доступные скрипты для разработчика

Все команды для сборки и тестирования теперь выполняются из корня репозитория:

```bash
# Проверить содержимое пакета (создаст magic-spec-X.Y.Z.tgz в папке dist/)
npm run check

# Опубликовать на npmjs.com вручную
npm publish

# Dry-run (имитация публикации)
npm publish --dry-run

# Полноценный релиз с обновлением версий (рекомендуется)
python scripts/publish.py <old_version> <new_version>
```

### Авторизация для публикации

```bash
# Один раз — откроет браузер для подтверждения
npm login
```

Сессия сохраняется в `~/.npmrc` до явного `npm logout`.

---

## Ссылки

- [Главный репозиторий](https://github.com/teratron/magic-spec)
- [PyPI пакет (Python-версия)](https://pypi.org/project/magic-spec/)
- [npmjs.com](https://www.npmjs.com/package/magic-spec)
- [Документация и спецификации](.design/)
