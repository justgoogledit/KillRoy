# register-tasks.ps1 -- idempotent registration of the four "Kilroy *" scheduled tasks
# (morning 07:00 with one 90-minute retry, deltas 11:00/13:00, closeout 16:00; Mon-Thu).
# Each task invokes run-phase.ps1 with the interactive user token (run only when logged
# on -- needed for Nova MCPs and user context; no stored credentials).
# UNVERIFIED until first Windows run -- static review only on the Mac (ticket 09).

$scriptPath = Join-Path $PSScriptRoot 'run-phase.ps1'

$tasks = @(
    @{ Name = 'Kilroy Morning';  Time = '07:00'; Phase = 'morning';  IsMorning = $true },
    @{ Name = 'Kilroy Delta 11'; Time = '11:00'; Phase = 'delta';    IsMorning = $false },
    @{ Name = 'Kilroy Delta 13'; Time = '13:00'; Phase = 'delta';    IsMorning = $false },
    @{ Name = 'Kilroy Closeout'; Time = '16:00'; Phase = 'closeout'; IsMorning = $false }
)

$days = @('Monday', 'Tuesday', 'Wednesday', 'Thursday')

# Interactive token: task runs only when the user is logged on. Do NOT switch this to
# -User/-Password stored credentials -- the headless runs need the logged-on session.
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive

foreach ($task in $tasks) {
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -Phase $($task.Phase)"
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $days -At $task.Time

    if ($task.IsMorning) {
        # RestartCount=1 + RestartInterval=90min lands the single retry at 08:30.
        $settings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable `
            -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun `
            -RestartCount 1 -RestartInterval (New-TimeSpan -Minutes 90)
    } else {
        $settings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable `
            -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    }

    # -Force makes re-registration idempotent: an existing task is overwritten in place.
    Register-ScheduledTask -TaskName $task.Name -Action $action -Trigger $trigger `
        -Principal $principal -Settings $settings -Force | Out-Null
    Write-Output "Registered '$($task.Name)' ($($task.Time) Mon-Thu, phase $($task.Phase))"
}
