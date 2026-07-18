param(
  [string]$DestinationRoot = "E:\Lafayette-CRM-Backups"
)

$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue) {
  $global:PSNativeCommandUseErrorActionPreference = $false
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$repoRoot = Split-Path -Parent $PSScriptRoot
$backupRoot = Join-Path $DestinationRoot "backup-$timestamp"
$crmStage = Join-Path $backupRoot "crm-source"
$wpStage = Join-Path $backupRoot "wordpress-site"

New-Item -ItemType Directory -Force -Path $crmStage, $wpStage | Out-Null

$robocopyArgs = @(
  $repoRoot,
  $crmStage,
  "/E",
  "/R:1",
  "/W:1",
  "/XD",
  ".git",
  ".next",
  ".vercel",
  "node_modules",
  "/XF",
  ".env",
  ".env.local",
  ".env.development",
  ".env.production"
)
& robocopy @robocopyArgs | Out-Null
$robocopyExitCode = $LASTEXITCODE
if ($robocopyExitCode -gt 7) {
  throw "Robocopy failed with exit code $robocopyExitCode"
}
$global:LASTEXITCODE = 0

$gitStatus = git -C $repoRoot status --short 2>$null
$gitLog = git -C $repoRoot log --oneline -n 25 2>$null
$gitBranch = git -C $repoRoot branch --show-current 2>$null

@"
# Lafayette CRM Local Backup

Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")
Source: $repoRoot

## Included

- Next.js CRM source files
- Prisma schema and migrations
- Tests and project docs
- Public assets
- Package manifests and project config

## Excluded Intentionally

- .env and local secrets
- node_modules
- .next build output
- .git history internals
- .vercel local project metadata

## Git

Branch: $gitBranch

Recent commits:

``````
$gitLog
``````

Working tree status at backup time:

``````
$gitStatus
``````
"@ | Set-Content -Path (Join-Path $crmStage "BACKUP-README.md") -Encoding UTF8

$siteBase = "https://lafayettelouisianarealestate.com"
$wpUrls = @{
  "home.html" = "$siteBase/"
  "agent-membership.html" = "$siteBase/agent-membership/"
  "buy-or-sell-a-home-in-lafayette.html" = "$siteBase/buy-or-sell-a-home-in-lafayette/"
  "wp-site-index.json" = "$siteBase/wp-json/"
  "wp-pages.json" = "$siteBase/wp-json/wp/v2/pages?per_page=100&context=view"
  "wp-posts.json" = "$siteBase/wp-json/wp/v2/posts?per_page=100&context=view"
  "wp-media.json" = "$siteBase/wp-json/wp/v2/media?per_page=100&context=view"
  "theme-style.css" = "$siteBase/wp-content/themes/lafayette-real-estate-ai-theme/style.css?ver=1.0.0"
  "theme-app.js" = "$siteBase/wp-content/themes/lafayette-real-estate-ai-theme/assets/app.js?ver=1.0.0"
}

foreach ($item in $wpUrls.GetEnumerator()) {
  try {
    Invoke-WebRequest -Uri $item.Value -OutFile (Join-Path $wpStage $item.Key) -UseBasicParsing
  } catch {
    "Failed to fetch $($item.Value): $($_.Exception.Message)" | Set-Content -Path (Join-Path $wpStage "$($item.Key).error.txt") -Encoding UTF8
  }
}

@"
# Lafayette Louisiana Real Estate WordPress Site Backup

Created: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz")
Site: $siteBase

## Included

- Public rendered HTML snapshots for key pages
- Public WordPress REST API index
- Public pages/posts/media JSON
- Public active theme stylesheet and app JavaScript discovered from live HTML
- Current architecture notes known from WordPress MCP diagnostics

## Known WordPress Runtime

- WordPress version observed earlier: 7.0
- Active theme from live HTML: lafayette-real-estate-ai-theme
- Important page: /agent-membership/
- Membership form snippet 12: active visual replacement, but POST verification returned a WordPress 404 document
- Membership form snippet 13: corrected admin-post.php version created inactive; activate this replacement before final form verification

## Active Plugins Observed Through WordPress MCP

- Advanced Custom Fields 6.8.6
- AI Provider for OpenAI 1.0.3
- Code Snippets 3.9.6
- Enable Abilities for MCP 2.0.18
- MCP Adapter 0.5.0
- Rank Math SEO 1.0.274.1
- WPVibe 1.9.1
- WP Mail SMTP 4.9.0

## Not Included

This is not a full server filesystem or database dump. Full WordPress backup still requires one of:

- Managed hosting backup export
- SFTP/SSH access to copy wp-content and wp-config.php
- A WordPress backup plugin export
- Database dump from hosting/phpMyAdmin
"@ | Set-Content -Path (Join-Path $wpStage "BACKUP-README.md") -Encoding UTF8

$crmZip = Join-Path $backupRoot "lafayette-crm-source-$timestamp.zip"
$wpZip = Join-Path $backupRoot "lafayette-wordpress-accessible-site-$timestamp.zip"
Compress-Archive -Path (Join-Path $crmStage "*") -DestinationPath $crmZip -Force
Compress-Archive -Path (Join-Path $wpStage "*") -DestinationPath $wpZip -Force

@{
  createdAt = (Get-Date).ToString("o")
  backupRoot = $backupRoot
  crmArchive = $crmZip
  wordpressArchive = $wpZip
  crmStage = $crmStage
  wordpressStage = $wpStage
} | ConvertTo-Json | Set-Content -Path (Join-Path $backupRoot "manifest.json") -Encoding UTF8

Write-Output "Backup created at $backupRoot"
Write-Output "CRM archive: $crmZip"
Write-Output "WordPress accessible-site archive: $wpZip"
