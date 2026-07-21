# run-phase.ps1 -- Task Scheduler wrapper: runs one autonomous Kilroy phase headless
# via `claude -p`, logging all output to Projects\daily\runs\ and propagating claude's
# exit code so Task Scheduler's retry logic sees failure.
# Invoked by the four "Kilroy *" scheduled tasks (see register-tasks.ps1).
# UNVERIFIED until first Windows run -- static review only on the Mac (ticket 09).

param(
    [string]$Phase
)

$validPhases = @('morning', 'delta', 'closeout')
if ($validPhases -notcontains $Phase) {
    Write-Output "run-phase.ps1: invalid -Phase '$Phase' (expected one of: $($validPhases -join ', '))"
    exit 2
}

# Repo root is two levels up from this script -- never hardcoded, the repo lives at a
# different path on each machine.
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $repoRoot

$runsDir = Join-Path $repoRoot 'Projects\daily\runs'
if (-not (Test-Path $runsDir)) {
    New-Item -ItemType Directory -Path $runsDir -Force | Out-Null
}

$logFile = Join-Path $runsDir "$(Get-Date -Format yyyy-MM-dd)-$Phase.log"

# Fail loud if the claude CLI is missing -- otherwise $LASTEXITCODE would be unset and
# the script would falsely exit 0.
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    "run-phase.ps1: 'claude' CLI not found on PATH" | Out-File -FilePath $logFile -Append
    exit 3
}

# No secrets loaded here -- claude and the kilroy-connectors MCP server read .env themselves.
& claude -p "/run-daily-workflow --autonomous --phase=$Phase" *>> $logFile

exit $LASTEXITCODE
