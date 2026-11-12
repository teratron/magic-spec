# {Product} Design System

**Version:** {X.Y.Z}
**Status:** {Draft | RFC | Stable | Deprecated}
**Layer:** {concept | implementation}
**Implements:** {l1-layer-1-file.md} <!-- Only if Layer is implementation -->

## Overview

<!-- One design-system specification per product with an interface. It is the one place tokens, components and the rules for overriding them are defined; screen and flow specifications reference it and never redefine a token. Applies to any surface a person sees and operates: a web page, a desktop or mobile screen, a terminal interface. -->

What the product looks and feels like in a few sentences, and the surfaces this design system covers.

## Related Specifications

- [other-spec.md](other-spec.md) - Screens and flows that use this design system.

## 1. Motivation

Why the product needs a design system of its own, and what goes wrong without one.

## 2. Design Context

<!-- Gathered first and cited. Absent all of them, say so here and state where the choices below come from. -->

- **Existing design system or tokens:** {where they live, or "none"}
- **Brand material:** {logo, voice, colours already fixed, or "none"}
- **Current interface:** {what exists today, or "none — new interface"}
- **Where the choices come from:** {references or decisions, one line each}

## 3. Tokens

| Token | Value | Use |
| --- | --- | --- |
| Colour — {name} | {value} | {where it is used, and the contrast it must meet} |
| Type — {name} | {family, size, weight, line height} | {where it is used} |
| Spacing — {name} | {value} | {where it is used} |
| Radius — {name} | {value} | {where it is used} |
| Elevation — {name} | {value} | {where it is used} |
| Motion — {name} | {duration, easing} | {where it is used; what `reduced motion` replaces it with} |

## 4. Components

### 4.1 {Component}

- **Variants:** {primary, secondary, …}
- **States:** {normal, hover, focus, active, disabled, loading, error — those that apply}
- **Behaviour:** {what the person can do in each state}
- **Accessible name and keyboard operation:** {how it is named, how it is reached and operated}

## 5. Overrides

<!-- The rules for departing from the system, in this one place. A screen specification that needs something not here amends this document. -->

- {When a token or component may be overridden, by whom, and where the override is recorded.}

## 6. Accessibility Baseline

- **Contrast:** {the level every colour pair meets}
- **Keyboard and focus order:** {the rule for every interactive element}
- **Accessible names:** {the rule}
- **Reduced motion:** {the rule}
- **Sizes or windows:** {the narrowest and widest the interface must work at}

## 7. Implementation Notes

<!-- Optional. Where the tokens live in the product's code, and how a change to one reaches the screens. -->

## Canonical References

<!-- Expected on Stable specifications: the authoritative files downstream agents read before implementing this one. -->

| Alias | Path | Purpose |
| --- | --- | --- |
| `[TOKENS]` | `{path/to/tokens.file}` | {Why this file is the source of truth for the tokens} |

## Document History

| Version | Date | Author | Description |
| --- | --- | --- | --- |
| {X.Y.Z} | {YYYY-MM-DD} | {Name} | Initial version |
