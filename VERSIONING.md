# Versioning & Release Workflow

## Semantic Versioning (SemVer)

`MAJOR.MINOR.PATCH` — e.g. `0.7.2`

- **PATCH** (`0.7.2` → `0.7.3`): Bug fixes, typo corrections, small CSS tweaks, JSON data fixes
- **MINOR** (`0.7.2` → `0.8.0`): New features, new homebrew integrations, upstream merges, notable UI changes
- **MAJOR** (`0.7.2` → `1.0.0`): Breaking changes, large architectural shifts, Multiple sweeping changes

## Conventional Commits

Format: `type(scope): description`

`body (optional)`

Keep descriptions all lowercase, no period at the end. Body is optional, keep in bulleted-list, all lowercase, with no periods at the end.

- - -

**Example:** 

```
feat(homebrew): auto-load brew sources on first visit

Pre-populate localStorage with homebrew URLs so players
don't need to manually add sources on first visit.
```

The first line becomes the changelog entry. The body is for context.

### Types and Scopes — 5etools Reference

The format is always `type(scope): description`. Use scope when the type alone doesn't make the area of change obvious.

**Types:**

| Type       | When to use                                          |
|------------|------------------------------------------------------|
| `feat`     | Adds, adjusts, or removes a feature or behavior       |
| `fix`      | Bug fix, broken link, rendering issue                 |
| `style`    | CSS/visual-only changes or code appearance            |
| `content`  | Data/JSON additions, removals, or corrections pertaining to actual written content         |
| `refactor` | Code restructuring with no behavior change            |
| `chore`    | Build, config, tooling, upstream merges, dependencies |
| `docs`     | Documentation, README, comments only                  |

**Scopes:**

| Scope      | What it covers                                                          |
|------------|-------------------------------------------------------------------------|
| `css`      | Stylesheets, SCSS, `custom-overrides.css`                               |
| `homebrew` | Homebrew JSON files, `managebrew.js`, brew loading behavior             |
| `data`     | Upstream `data/` JSON files (spells, monsters, items, etc.)             |
| `upstream` | Merging or resolving changes from the upstream 5etools repo             |
| `build`    | `node build`, service worker, Workbox config, npm scripts               |
| `ui`       | Page layout, navigation, filters, DM Screen, modals                     |
| `format`   | Data formatting, JSON structure, schema compliance                       |
| `tags`     | Cross-reference `{@tag}` fixes in data files                            |

**Combined examples — matching common 5etools fork tasks:**

| Commit message                                                | Contents                                              |
|---------------------------------------------------------------|-------------------------------------------------------------|
| `feat(css): add night mode color variables`                   | New visual feature in custom-overrides.css                  |
| `feat(homebrew): auto-load brew sources on first visit`       | New homebrew loading behavior for players                   |
| `feat(ui): add sticky table headers to bestiary`              | UI enhancement on a specific page                           |
| `fix(tags): correct broken spell references in PHB2024`       | Fixing `{@spell}` cross-references in data JSON             |
| `fix(homebrew): resolve monster CR filter crash`              | Bug in homebrew-loaded content                              |
| `fix(css): night mode unreadable text in spell tables`        | Visual bug in custom styles                                 |
| `style(css): adjust sidebar width on mobile`                  | Pure visual tweak, no new feature                           |
| `style: reduce heading font size on adventure pages`          | Visual tweak not specific to one scope                      |
| `content(data): remove PHB superseded by PHB2024`             | Removing a sourcebook replaced by a newer compilation       |
| `content(data): add missing MM'24 creature fluff`             | Adding data upstream missed or you want sooner              |
| `content(format): normalize JSON indentation in spell files`   | Fixing formatting to match 5etools schema                   |
| `content(homebrew): add Tal'Dorei updated magic items`        | New homebrew JSON file                                      |
| `chore(upstream): merge upstream v2.28.0`                     | Pulling in a new upstream release                           |
| `chore(build): update service worker cache config`            | Workbox/build tooling change                                |
| `refactor(css): migrate SCSS overrides to custom-overrides`   | Moving customizations out of upstream SCSS files            |
| `refactor(homebrew): separate brew repo from base repo`       | Architectural restructuring                                 |
| `docs: add versioning and release workflow guide`             | This file, README changes, etc.                             |

### Converting

The 5etools changelog uses plain English prefixes like "Added ...", "Fixed ...", "(Brew) ...". Conventional commits produce the same information, just structured for automation:

| Upstream changelog style                                       | Your commit equivalent                                  |
|----------------------------------------------------------------|---------------------------------------------------------|
| Added "Save Slot" system to DM Screen                         | `feat(ui): add save slot system to DM Screen`           |
| Fixed hover windows failing to open in Dynamic Map Viewer      | `fix(ui): hover windows not opening in map viewer`      |
| (Brew) Fixed crash when loading partnered content index        | `fix(homebrew): crash loading partnered content index`   |
| (Fixed typos/added tags)                                       | `fix(tags): typos and tag corrections`                  |
| (Updated Font Awesome version)                                 | `chore: update Font Awesome version`                    |

## Tags

A tag is a permanent label on a specific commit. It's how Git and GitHub identify releases.

When running the release script, it:
1. Bumps the version in `package.json` (and other files the version-bump touches)
2. Creates a commit with the version change
3. Creates a tag pointing at that commit
4. Pushes both the commit and the tag to GitHub
5. Creates a GitHub Release with changelog

## Auto-Release Script

From the repo root:

```bash
./release.sh
```

It will:
1. Show all commits since the last tag
2. Ask for the bump type (patch / minor / major)
3. Ask for an optional release title (e.g. "Upstream Sync Edition")
4. Generate a `CHANGELOG.md` entry (conventional commit format, for reference)
5. Run `npm run version-bump` to update version across files
6. Push everything (commits + tag)
7. Create a GitHub Release with a changelog
