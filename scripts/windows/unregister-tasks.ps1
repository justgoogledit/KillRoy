# unregister-tasks.ps1 -- clean removal of the four "Kilroy *" scheduled tasks.
# Tolerant of tasks that are already absent (reports, does not error).
# UNVERIFIED until first Windows run -- static review only on the Mac (ticket 09).

$taskNames = @('Kilroy Morning', 'Kilroy Delta 11', 'Kilroy Delta 13', 'Kilroy Closeout')

foreach ($name in $taskNames) {
    $existing = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $name -Confirm:$false
        Write-Output "Removed '$name'"
    } else {
        Write-Output "'$name' not found (already removed)"
    }
}
