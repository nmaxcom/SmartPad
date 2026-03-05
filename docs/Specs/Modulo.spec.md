# SmartPad Modulo Operator (`mod`) Spec

This spec defines modulo behavior for `mod` and `%` operators in SmartPad expressions.

---

## 0) Goals

1. Support readable remainder math with `mod` keyword syntax.
2. Keep operator precedence aligned with `*`, `/`, `%`.
3. Maintain parity between `mod` and `%`.

---

## 1) Syntax

Supported forms:

1. `a mod b`
2. `a % b`
3. Parenthesized and mixed arithmetic:
   - `(44 mod 4) + 5`
   - `10 mod 3 * 2`
4. Variable-based operands:
   - `value mod 4`

---

## 2) Evaluation Contract

1. `mod` and `%` are equivalent operations.
2. Precedence: same as multiplication/division.
3. Left-to-right evaluation for same-precedence operators.
4. Unary signs are applied before modulo evaluation where syntactically valid.

---

## 3) Acceptance Examples

1. `10 mod 3 =>` -> `1`
2. `(44 mod 4) + 5 =>` -> `5`
3. `10 mod 3 * 2 =>` -> `2`
4. `-10 mod 3 =>` -> `-1`

---

## 4) Notes

1. `mod` tokenization is supported in expression parsing and semantic highlighting.
2. Variable names that merely contain `mod` (for example `modu`) are not treated as the modulo operator.
