---
title: Troubleshooting
sidebar_position: 4
---

# Troubleshooting

## If conversions fail

- Verify the target unit/currency exists and is spelled correctly.
- Use explicit `value in TARGET` syntax instead of custom arrows.
- Check manual FX overrides before expecting live provider values.

## If outputs look wrong

- Split formulas into named steps and evaluate line-by-line.
- Validate list/range boundaries and step definitions.
- Review locale-sensitive date and decimal parsing assumptions.

## If behavior still feels off

- Go to [Feature Guides](/docs/specs) and open the relevant contract page.
