# GitHub Backup Instructions

The Lafayette CRM backup artifacts have already been written to:

```text
E:\Lafayette-CRM-Backups\backup-20260717-215912
```

## Files To Commit

From the CRM project folder:

```text
C:\Users\captt\Documents\Codex\2026-06-21\build-phase-1-of-a-real
```

Commit these new files:

```text
docs\start-to-finished-product-tutorial.md
public\lafayette-crm-build-tutorial.html
scripts\create-local-backup.ps1
GITHUB-BACKUP-INSTRUCTIONS.md
```

## PowerShell Commands

```powershell
cd C:\Users\captt\Documents\Codex\2026-06-21\build-phase-1-of-a-real
git add docs\start-to-finished-product-tutorial.md public\lafayette-crm-build-tutorial.html scripts\create-local-backup.ps1 GITHUB-BACKUP-INSTRUCTIONS.md
git commit -m "Add product build tutorial and backup script"
git push origin main
```

## Why Codex Could Not Push Directly

Codex confirmed:

- GitHub connector can read `fishboytroy/FLO_CRM`, but write attempts returned `403 Resource not accessible by integration`.
- The local `.git` directory is read-only in the Codex sandbox, so Codex could not create `.git/index.lock` to stage a commit.
- GitHub CLI is not installed on this machine.

## Verified Locally

- `npm test` passed 79/79.
- `npm run build` passed.
- E: backup contains CRM source archive, WordPress accessible-site archive, tutorial markdown, animated tutorial HTML, and manifest.
