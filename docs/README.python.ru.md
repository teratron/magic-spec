# magic-spec — Python инстоллер

Инстоллер `magic-spec` для PyPI/uvx. Устанавливает систему Specification-Driven Development (SDD) в любой проект.

---

## Быстрый старт

### Через `uvx` (рекомендуется, без глобальной установки)

```bash
uvx magic-spec
```

`uvx` автоматически скачает и запустит пакет в изолированном окружении. Повторные запуски используют кэш.

### Через `pip`

```bash
pip install magic-spec
magic-spec
```

### Через `pipx` (глобальная установка)

```bash
pipx install magic-spec
magic-spec
```

---

## Что делает инстоллер

После выполнения команды в вашем проекте появятся:

```plaintext
ваш-проект/
│
├── .magic/                     # Движок SDD (не трогать вручную)
│   ├── plan.md
│   ├── retrospective.md
│   ├── rule.md
│   ├── specification.md
│   ├── task.md
│   └── scripts/
│       ├── init.sh             # Скрипт инициализации (macOS/Linux)
│       └── init.ps1            # Скрипт инициализации (Windows)
│
├── .agent/workflows/magic/     # Точки входа для AI-агентов (Cursor, Claude и др.)
│   ├── plan.md
│   ├── retrospective.md
│   ├── rule.md
│   ├── specification.md
│   └── task.md
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
uvx magic-spec
```

Устанавливает `.magic/` и весь `.agent/` (полный набор адаптеров).

### Выбор конкретного окружения (адаптера)

Если вы хотите установить адаптер только для конкретного AI-агента, укажите флаг `--env`:

```bash
# Только для Cursor
uvx magic-spec --env cursor

# Только для Claude
uvx magic-spec --env claude

# Только для Gemini
uvx magic-spec --env gemini

# Несколько окружений сразу
uvx magic-spec --env cursor --env claude
```

### Обновление движка

Обновляет `.magic/` до последней версии, **не затрагивая** `.design/` (ваши спеки, планы, задачи):

```bash
uvx magic-spec --update
```

### Справка

```bash
uvx magic-spec --help
```

---

## Требования

| Инструмент | Минимальная версия |
| :--- | :--- |
| Python | >= 3.8 |
| uv / pip / pipx | любая актуальная |

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
installers/python/
│
├── magic_spec/
│   ├── __init__.py     # Пакет Python
│   └── __main__.py     # Точка входа CLI
│
├── pyproject.toml      # Конфигурация пакета (hatchling + uv)
├── README.md           # Этот файл
├── LICENSE             # Лицензия
│
└── dist/               # Папка сборки (gitignored)
    ├── magic_spec-X.Y.Z-py3-none-any.whl
    └── magic_spec-X.Y.Z.tar.gz
```

### Доступные команды для разработчика

Все команды выполняются из папки `installers/python/`:

```bash
# Синхронизировать движок из корня репозитория
# (подтягивает .magic/, .agent/, adapters/, README.md, LICENSE)
uv run hatch run sync

# Собрать пакет (.whl и .tar.gz в dist/)
uv build

# Опубликовать на PyPI (интерактивно)
uv publish

# Опубликовать с токеном
uv publish --token pypi-xxxxxxxxxxxxxxxxxx

# Локальное тестирование — метод A (editable install)
pip install -e .
magic-spec              # проверить в любой директории
magic-spec --env cursor

# Локальное тестирование — метод B (wheel)
uv build
pip install dist/magic_spec-*.whl

# Локальное тестирование — метод C (прямой запуск, без установки)
uv run python -m magic_spec
uv run python -m magic_spec --env cursor

# Повысить версию (вручную в pyproject.toml)
# version = "X.Y.Z" → поднять нужную часть
```

### Авторизация для публикации

```bash
# Передайте токен напрямую при публикации
uv publish --token pypi-xxxxxxxxxxxxxxxxxx
```

Токен получается на [pypi.org](https://pypi.org/) → **Account Settings** → **API tokens**.

---

## Ссылки

- [Главный репозиторий](https://github.com/teratron/magic-spec)
- [npm пакет (Node.js-версия)](https://www.npmjs.com/package/magic-spec)
- [PyPI](https://pypi.org/project/magic-spec/)
- [Документация и спецификации](.design/)
