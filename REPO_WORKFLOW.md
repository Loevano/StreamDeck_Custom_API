# Repo Workflow Guidelines

Repository target: `https://github.com/Loevano/StreamDeck_Custom_API`

## 1. Git setup (first time)

```bash
git init
git remote add origin git@github.com:Loevano/StreamDeck_Custom_API.git
```

If already initialized, verify remote:

```bash
git remote -v
```

## 2. Branch strategy

- `main`: release-ready branch.
- Feature work: `feature/<short-topic>`.
- Fix work: `fix/<short-topic>`.
- Release prep (optional): `release/<version>`.

Example:

```bash
git checkout -b feature/dynamic-layout-state-polling
```

## 3. Changelog update rules

Before opening a PR, update `CHANGELOG.md` in `## [Unreleased]`.

Rules:

- Add every user-visible change.
- Use sections: `Added`, `Changed`, `Fixed`, `Removed`, `Security`.
- Keep entries short and action-oriented.
- Do not write internal-only noise (e.g., formatting-only edits) unless behavior changed.

Release cut:

1. Move entries from `Unreleased` to a new version header.
2. Add release date in `YYYY-MM-DD` format.
3. Keep a fresh empty `Unreleased` section at the top.

## 4. Commit style

Use imperative, scoped messages:

- `feat(runtime): add layout refresh with dynamic page mapping`
- `fix(state): handle disabled keys from API payload`
- `docs(readme): document build and install artifact`

Commit flow:

```bash
git add .
git commit -m "feat(runtime): add layout and state polling loop"
```

## 5. Pull request checklist

Before PR:

- `npm run build` passes.
- `CHANGELOG.md` updated.
- README updated if setup/config/build steps changed.
- No debug logs or temporary files committed.

PR description should include:

- What changed.
- Why it changed.
- How it was tested.
- Any API contract changes.

## 6. Release workflow

1. Update `package.json` version.
2. Move changelog entries from `Unreleased` to new version block.
3. Build release artifact:

```bash
npm run build
```

4. Commit and tag:

```bash
git add package.json CHANGELOG.md
git commit -m "chore(release): v0.1.0"
git tag v0.1.0
```

5. Push branch and tags:

```bash
git push origin main
git push origin v0.1.0
```

## 7. Rollback guidance

If a release is bad:

1. Revert the problematic commit on `main`.
2. Add a `Fixed` changelog entry under `Unreleased`.
3. Ship a patch release (`x.y.z+1`).

Avoid rewriting shared branch history after publishing tags.
