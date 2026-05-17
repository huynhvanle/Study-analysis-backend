# Quiz Question Excel Import Template

This document locks the `.xlsx` template and validation rules for bulk quiz-question import.
It is the source of truth for the future `POST /quizzes/{quizId}/questions/import` flow.

## Scope

- Only `.xlsx` files are supported in the first iteration.
- Only the first worksheet is read.
- The import targets an existing `quizId`.
- The import is all-or-nothing: if any row is invalid, no questions are created.
- Admin download sample file: `frontend/templates/quiz-question-import-template.xlsx`.

## Worksheet Format

- Row `1` is the header row.
- Data starts at row `2`.
- The preferred header can contain these columns in this order:
  1. `prompt`
  2. `explanation`
  3. `optionA`
  4. `optionB`
  5. `optionC`
  6. `optionD`
  7. `correctCode`
- Of those columns, `prompt`, `optionA`, `optionB`, `optionC`, `optionD`, `correctCode`
  are required and `explanation` is optional.
- For backward compatibility, old files that still contain an `orderIndex` column are accepted.
- Imported rows are appended after the current last question of the quiz.
- `orderIndex` is auto-assigned as `max(orderIndex) + 1`, then increased by `1` for each valid row in file order.
- Header values are matched after trimming whitespace.
- Extra columns after the supported headers are ignored.
- A fully blank data row is ignored.
- A partially blank row is validated and can fail the import.

## Example Sheet

```text
prompt                    | explanation                                 | optionA                | optionB           | optionC        | optionD        | correctCode
Java la gi?               | Java la ngon ngu lap trinh huong doi tuong. | Ngon ngu lap trinh     | He dieu hanh      | Trinh duyet    | Co so du lieu  | A
JVM viet tat cua cum nao? | JVM la may ao dung de chay bytecode Java.   | Java Virtual Machine   | Java Vendor Mode  | Joint VM       | JSON View Map  | A
```

## Column Rules

### `orderIndex`

- The system auto-generates this value during import.
- New rows are assigned `max(orderIndex)` currently in the quiz plus `1`, `2`, `3`, ... in Excel row order.
- Admins do not need to provide this column in the new template.
- If an old file still contains the `orderIndex` column, its values are ignored.

### `prompt`

- Required text.
- Trim leading and trailing whitespace before validation.
- Must not be blank after trimming.
- Stored value uses the trimmed content.

### `explanation`

- Optional text.
- Trim leading and trailing whitespace before validation.
- Empty cells are accepted.
- If provided, must not exceed `2000` characters.
- Stored value uses the trimmed content.

### `optionA`

- Required text.
- Trim leading and trailing whitespace before validation.
- Must not be blank after trimming.
- Stored value uses the trimmed content.

### `optionB`

- Required text.
- Trim leading and trailing whitespace before validation.
- Must not be blank after trimming.
- Stored value uses the trimmed content.

### `optionC`

- Required text.
- Trim leading and trailing whitespace before validation.
- Must not be blank after trimming.
- Stored value uses the trimmed content.

### `optionD`

- Required text.
- Trim leading and trailing whitespace before validation.
- Must not be blank after trimming.
- Stored value uses the trimmed content.

### `correctCode`

- Required text.
- Trim leading and trailing whitespace, then uppercase the value.
- Accepted values: `A`, `B`, `C`, `D`.
- Any other value fails validation.
- The normalized value is stored.
- Invalid examples:
  - empty cell
  - `E`
  - `AB`
  - `1`

## File-Level Validation

- The first worksheet must contain the required headers described above.
- At least one valid data row must exist after the header.
- Any row that contains data but misses one or more required cells fails the import.
- Any row with a `correctCode` outside `A/B/C/D` fails the import.

## Import Preconditions

- The target quiz must exist.
- The target quiz must not have submitted quiz results.

These guardrails keep import safe while still allowing admins to append new questions
to an existing quiz before any learner submission happens.

## Error Reporting Contract

- Validation errors should be reported using the Excel row number (`2`, `3`, `4`, ...).
- Each error should include:
  - `rowNumber`
  - `column`
  - `message`
- If multiple rows are invalid, return all row errors in one response so the admin can
  fix the file in one pass.

## Mapping To Existing Quiz Model

- Each data row maps 1:1 to `QuizQuestionRequest`.
- `orderIndex` is generated automatically from the current quiz state.
- `prompt` maps to `prompt`.
- `explanation` maps to the optional explanation shown in Plus review mode.
- `optionA` .. `optionD` map to the four fixed answer choices already used by the quiz flow.
- `correctCode` maps to the existing `A/B/C/D` answer key model.
