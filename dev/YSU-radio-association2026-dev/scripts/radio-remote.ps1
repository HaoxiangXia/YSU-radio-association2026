[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet(
        "Inventory", "Bootstrap", "Deploy", "Configure", "Admissions",
        "Status", "Backup", "Rollback", "Restore", "Tunnel",
        "PublicPrepare", "PublicEnable", "PublicStatus"
    )]
    [string]$Action,

    [Parameter(Mandatory = $true)]
    [ValidatePattern("^[A-Za-z0-9._-]+$")]
    [string]$Server,

    [ValidatePattern("^[A-Za-z_][A-Za-z0-9_-]*$")]
    [string]$User = "root",

    [ValidateRange(1, 65535)]
    [int]$Port = 22,

    [string]$IdentityFile,
    [string]$Commit,
    [string]$File,
    [string]$BackupPath,

    [ValidatePattern("^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")]
    [string]$Domain
)

$ErrorActionPreference = "Stop"
$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Target = "$User@$Server"

function Get-ConnectionArgs {
    $arguments = @("-p", "$Port", "-o", "BatchMode=yes")
    if ($IdentityFile) {
        $resolvedIdentity = (Resolve-Path -LiteralPath $IdentityFile).Path
        $arguments += @("-i", $resolvedIdentity)
    }
    return $arguments
}

function Invoke-Ssh {
    param([Parameter(Mandatory = $true)][string]$Command)
    $arguments = Get-ConnectionArgs
    & ssh @arguments $Target $Command
    if ($LASTEXITCODE -ne 0) {
        throw "SSH command failed with exit code $LASTEXITCODE"
    }
}

function Send-File {
    param(
        [Parameter(Mandatory = $true)][string]$LocalPath,
        [Parameter(Mandatory = $true)][string]$RemotePath
    )
    $arguments = Get-ConnectionArgs
    $scpArguments = @("-P", "$Port", "-o", "BatchMode=yes")
    if ($IdentityFile) {
        $resolvedIdentity = (Resolve-Path -LiteralPath $IdentityFile).Path
        $scpArguments += @("-i", $resolvedIdentity)
    }
    & scp @scpArguments $LocalPath "${Target}:$RemotePath"
    if ($LASTEXITCODE -ne 0) {
        throw "SCP upload failed with exit code $LASTEXITCODE"
    }
}

function Invoke-PublicSiteAction {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("prepare", "enable", "status")]
        [string]$PublicAction
    )
    if (-not $Domain) {
        throw "$PublicAction requires -Domain <完整域名>"
    }

    $script = Join-Path $RepositoryRoot "scripts\configure-public-site.sh"
    $token = [Guid]::NewGuid().ToString("N")
    $remoteScript = "/tmp/radio-public-$token.sh"

    if ($PublicAction -eq "status") {
        Send-File $script $remoteScript
        Invoke-Ssh "trap 'rm -f $remoteScript' EXIT; sudo bash $remoteScript status $Domain"
        return
    }

    $logFormat = Join-Path $RepositoryRoot "deployment\nginx\radio-association-log-format.conf"
    $remoteLogFormat = "/tmp/radio-nginx-log-$token.conf"
    if ($PublicAction -eq "prepare") {
        $template = Join-Path $RepositoryRoot "deployment\nginx\radio-association-public-http.conf.template"
        $remoteTemplate = "/tmp/radio-nginx-http-$token.conf.template"
        Send-File $script $remoteScript
        Send-File $template $remoteTemplate
        Send-File $logFormat $remoteLogFormat
        Invoke-Ssh "trap 'rm -f $remoteScript $remoteTemplate $remoteLogFormat' EXIT; sudo bash $remoteScript prepare $Domain $remoteTemplate $remoteLogFormat"
        return
    }

    $template = Join-Path $RepositoryRoot "deployment\nginx\radio-association-public-https.conf.template"
    $renewHook = Join-Path $RepositoryRoot "scripts\ops\reload-radio-nginx.sh"
    $remoteTemplate = "/tmp/radio-nginx-https-$token.conf.template"
    $remoteRenewHook = "/tmp/radio-nginx-renew-$token.sh"
    Send-File $script $remoteScript
    Send-File $template $remoteTemplate
    Send-File $logFormat $remoteLogFormat
    Send-File $renewHook $remoteRenewHook
    Invoke-Ssh "trap 'rm -f $remoteScript $remoteTemplate $remoteLogFormat $remoteRenewHook' EXIT; sudo bash $remoteScript enable $Domain $remoteTemplate $remoteLogFormat $remoteRenewHook"
}

function Resolve-Commit {
    if (-not $Commit) {
        throw "Bootstrap and Deploy require an explicit 40-character -Commit SHA"
    }
    if ($Commit -notmatch "^[0-9a-f]{40}$") {
        throw "Commit must be a 40-character lowercase hexadecimal SHA"
    }
    & git -C $RepositoryRoot cat-file -e "$Commit`^{commit}"
    if ($LASTEXITCODE -ne 0) {
        throw "Commit $Commit does not exist in the local repository"
    }
    return $Commit
}

function New-ReleaseArchive {
    param([Parameter(Mandatory = $true)][string]$Sha)
    $token = [Guid]::NewGuid().ToString("N")
    $archive = Join-Path ([System.IO.Path]::GetTempPath()) "radio-release-$Sha-$token.tar.gz"
    & git -C $RepositoryRoot archive --format=tar.gz "--output=$archive" $Sha
    if ($LASTEXITCODE -ne 0) {
        throw "git archive failed"
    }
    return $archive
}

switch ($Action) {
    "Inventory" {
        $script = Join-Path $RepositoryRoot "scripts\collect-server-info.sh"
        $token = [Guid]::NewGuid().ToString("N")
        $remote = "/tmp/radio-inventory-$token.sh"
        Send-File $script $remote
        Invoke-Ssh "trap 'rm -f $remote' EXIT; bash $remote"
    }
    "Bootstrap" {
        $sha = Resolve-Commit
        $archive = New-ReleaseArchive $sha
        try {
            $token = [Guid]::NewGuid().ToString("N")
            $remote = "/tmp/radio-bootstrap-$sha-$token.tar.gz"
            $work = "/tmp/radio-bootstrap-$sha-$token"
            Send-File $archive $remote
            Invoke-Ssh "set -e; trap 'rm -rf $work $remote' EXIT; mkdir -p $work; tar -xzf $remote -C $work; sudo bash $work/scripts/bootstrap-server.sh"
        }
        finally {
            Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
        }
    }
    "Deploy" {
        $sha = Resolve-Commit
        $archive = New-ReleaseArchive $sha
        try {
            $checksum = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant()
            $token = [Guid]::NewGuid().ToString("N")
            $remote = "/tmp/radio-release-$sha-$token.tar.gz"
            Send-File $archive $remote
            Invoke-Ssh "trap 'rm -f $remote' EXIT; sudo radioctl deploy $remote $sha $checksum"
        }
        finally {
            Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue
        }
    }
    "Configure" {
        if (-not $File) { throw "Configure requires -File <recruitment.json>" }
        $resolved = (Resolve-Path -LiteralPath $File).Path
        $token = [Guid]::NewGuid().ToString("N")
        $remote = "/tmp/radio-recruitment-$token.json"
        Send-File $resolved $remote
        Invoke-Ssh "trap 'rm -f $remote' EXIT; sudo radioctl configure $remote"
    }
    "Admissions" {
        if (-not $File) { throw "Admissions requires -File <admissions.json>" }
        $resolved = (Resolve-Path -LiteralPath $File).Path
        $token = [Guid]::NewGuid().ToString("N")
        $remote = "/tmp/radio-admissions-$token.json"
        Send-File $resolved $remote
        Invoke-Ssh "trap 'rm -f $remote' EXIT; sudo radioctl admissions $remote"
    }
    "Status" {
        Invoke-Ssh "sudo radioctl status"
    }
    "Backup" {
        Invoke-Ssh "sudo radioctl backup"
    }
    "Rollback" {
        if ($Commit) {
            if ($Commit -notmatch "^[0-9a-f]{40}$") { throw "Invalid commit SHA" }
            Invoke-Ssh "sudo radioctl rollback $Commit"
        }
        else {
            Invoke-Ssh "sudo radioctl rollback"
        }
    }
    "Restore" {
        if (-not $BackupPath) { throw "Restore requires -BackupPath" }
        if ($BackupPath -notmatch "^/var/backups/radio-association/[A-Za-z0-9._-]+\.sqlite$") {
            throw "BackupPath must be a .sqlite file under /var/backups/radio-association/"
        }
        $confirmation = Read-Host "Type RESTORE to stop the service and restore the database"
        if ($confirmation -ne "RESTORE") { throw "Restore cancelled" }
        Invoke-Ssh "sudo radioctl restore $BackupPath --confirm"
    }
    "Tunnel" {
        $arguments = Get-ConnectionArgs
        & ssh @arguments -N -L "8080:127.0.0.1:8080" $Target
        if ($LASTEXITCODE -ne 0) {
            throw "SSH tunnel failed with exit code $LASTEXITCODE"
        }
    }
    "PublicPrepare" {
        Invoke-PublicSiteAction -PublicAction "prepare"
    }
    "PublicEnable" {
        Invoke-PublicSiteAction -PublicAction "enable"
    }
    "PublicStatus" {
        Invoke-PublicSiteAction -PublicAction "status"
    }
}
