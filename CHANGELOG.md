# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-02-25

### Added

- Полная поддержка абстрактных шаблонов окружения с автоматическим разрешением (`{ARGUMENTS}`) во всех CLI.
- Внедрен файл `.magicrc.json` для персистентности выбранных окружений и их автоопределения.
- Двухуровневая автоматическая генерация Changelog (через накопление блоков `Changes` в задачах).
- В CLI добавлены команды: `info`, `--check`, `--list-envs` и `--eject`.
- Внедрено отслеживание версии ядра в рамках проекта через файл `.magic/.version`.

### Changed

- **Архитектура:** Репозиторий перестроен в двухуровневую модель (root = source of truth + installers), папка `core/` удалена для устранения дублирования.
- **Node Installer:** Полностью переработан механизм установки (теперь он использует скомпилированные файлы из NPM, а не скачивает их с GitHub, устранена уязвимость Path Traversal).
- **Python Installer:** Реализован изолированный пакет на базе `hatchling` (через shared-data) без внешних зависимостей к GitHub.
- **Документация:** Разделены стратегии `README.md` (разные фокусы для GitHub, NPM пакета и PyPI пакета).
- **Обновление:** Более безопасная логика обновления `.magic` (старые папки теперь перемещаются в `.magic/archives/`, а не просто удаляются).

## [1.2.3] - 2026-02-23

### Added

- **Handoff integrations** (`magic.*.md`): Introduced explicit handoff blocks across all agent workflow wrappers to guide next-steps effortlessly.
- **Task Engine Enhancement:** Integrated User Stories generation parsing into `.magic/task.md` and suppressed user priority prompts using `RULES.md C4`.
- **System Automation Hooks:** Added `generate-context` script hooks into `task.md` and `run.md` post-write triggers.
- **Context Automation Script:** Created `generate-context.sh` and `generate-context.ps1` to assemble `CONTEXT.md` from PLAN, workspace trees, and changelogs.
- **Spec Engine Protections:** Added strict Explore Mode Safety rules and Delta Editing constraints for spec updates over 200 lines to `.magic/spec.md`.
- **Explore Hints:** Updated `.agent/workflows/magic.spec.md` UI wrapper with tips to use Delta Constraints and strict read-only explore mode.
- **CLI Doctor Command (Node/Python):** Implemented `--doctor` and `--check` parsing in installers, executing the prerequisite script and outputting a formatted terminal validation report.
- **Interactive Onboarding Script:** Created `.magic/onboard.md` to guide new developers through building a toy "console logger" specification.
- **Onboarding Wrapper:** Added `.agent/workflows/magic.onboard.md` to trigger the interactive onboarding tutorial seamlessly.
- **Prerequisite Validation:** Created `check-prerequisites.sh` and `check-prerequisites.ps1` parsing `INDEX.md` and returning valid JSON results.
