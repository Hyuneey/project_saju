param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$LogPath = Join-Path $RepoRoot ".next-dev.log"

Set-Location -LiteralPath $RepoRoot
"Starting web dev server on 127.0.0.1:$Port" | Set-Content -LiteralPath $LogPath

try {
  corepack pnpm --filter web dev --hostname 127.0.0.1 --port $Port *>> $LogPath
} catch {
  $_ | Out-String | Add-Content -LiteralPath $LogPath
  exit 1
}
