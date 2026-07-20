# Projects

One folder per active project. Suggested layout:

```
Projects/
├── Projects.md                  ← index of active projects
└── <project-slug>/
    ├── <project-slug>.md        ← the project's main note (overview, status, links)
    ├── notes/
    │   └── YYYY-MM-DD-<topic>.md
    └── specs/                   ← if you adopt a brainstorming/writing-plans skill
```

## Conventions

- **Slug = folder name.** Lowercase, hyphenated. Match the slug in the main note's filename.
- **Main note is the entrypoint.** Anything you'd want Claude to read first about the project lives there: goals, current status, key links to repos / docs / dashboards.
- **`notes/` for dated working notes.** One file per working session or major topic. The format `YYYY-MM-DD-<slug>.md` keeps them sortable.
- **Archive completed projects** to `Projects-archive/` (or move to a separate folder) so active project context stays small.
