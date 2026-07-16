# Vault log

Append-only index. Each entry is one line written by `session-recap` after every working session.

Format: `## [YYYY-MM-DD] <type> | <slug>`

Types: `lesson`, `setup`, `source`, `project`.

This file is how future sessions discover that something happened without reading every file in `Knowledge/Lessons/`.

---
