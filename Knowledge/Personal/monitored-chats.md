# Monitored Teams group chats

Config for which Teams group chats Kilroy scans and summarizes. Consumed by
[[Skills/run-daily-workflow/SKILL|run-daily-workflow]]'s morning Teams gathering and by
[[Skills/triage-personal-items/SKILL|triage-personal-items]]'s Teams pull (Step 2).
Group-chat scanning is scoped to exactly the chats listed below -- nothing else gets
summarized, and no chat name lives hardcoded in any skill.

**Rule:** if this file is missing or has no filled rows, skills skip group-chat scanning
entirely and record that in their status output (`group chats not configured`) -- they
never guess chat names.

## Chats

<!-- TO FILL AT BOOTSTRAP -- ask Jordan for the exact chat names.
     The work-PC bootstrap (autonomy ticket 07) asks Jordan which group chats matter and
     fills these rows in. Until then every row below is a placeholder, and skills must
     treat this file as unfilled. Use the exact Teams chat display name -- it's what the
     `microsoft-teams` MCP matches on. -->

| Chat display name | Why monitored |
| --- | --- |
| <exact Teams chat display name> | <one line: why Kilroy summarizes this chat> |
| <exact Teams chat display name> | <one line: why Kilroy summarizes this chat> |
| <exact Teams chat display name> | <one line: why Kilroy summarizes this chat> |
