param()

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$rootEnvPath = Join-Path $repoRoot ".env.local"
$webEnvPath = Join-Path $repoRoot "apps/web/.env.local"
$apiDirectory = Join-Path $repoRoot "apps/api"
$wranglerPath = Join-Path $apiDirectory "node_modules/.bin/wrangler.cmd"

function Get-DotEnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required environment file is missing: $Path"
  }

  $escapedName = [Regex]::Escape($Name)
  $line = Get-Content -LiteralPath $Path |
    Where-Object { $_ -match "^\s*$escapedName\s*=" } |
    Select-Object -First 1

  if (-not $line) {
    throw "$Name is missing from $Path"
  }

  $value = ($line -replace "^\s*$escapedName\s*=", "").Trim()
  if (
    ($value.StartsWith('"') -and $value.EndsWith('"')) -or
    ($value.StartsWith("'") -and $value.EndsWith("'"))
  ) {
    $value = $value.Substring(1, $value.Length - 2)
  }

  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "$Name is empty in $Path"
  }

  return $value
}

if (-not (Test-Path -LiteralPath $wranglerPath)) {
  throw "Wrangler is not installed. Run pnpm install from $repoRoot first."
}

$supabaseUrl = Get-DotEnvValue -Path $webEnvPath -Name "NEXT_PUBLIC_SUPABASE_URL"
$supabasePublishableKey = Get-DotEnvValue `
  -Path $webEnvPath `
  -Name "NEXT_PUBLIC_SUPABASE_ANON_KEY"

$cloudflareToken = $env:CLOUDFLARE_API_TOKEN
if ([string]::IsNullOrWhiteSpace($cloudflareToken)) {
  $cloudflareToken = Get-DotEnvValue -Path $rootEnvPath -Name "CLOUDFLARE_API_TOKEN"
}

$bunnyLibraryId = (Read-Host "Bunny Stream Library ID").Trim()
if ($bunnyLibraryId -notmatch "^\d+$") {
  throw "Bunny Stream Library ID must contain only digits."
}

$secureBunnyApiKey = Read-Host "Bunny Stream API key (input is hidden)" -AsSecureString
$bunnyApiKeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureBunnyApiKey)
$bunnyApiKey = $null
$temporarySecretsPath = $null
$originalCloudflareToken = $env:CLOUDFLARE_API_TOKEN

try {
  $bunnyApiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bunnyApiKeyPointer)
  if ([string]::IsNullOrWhiteSpace($bunnyApiKey)) {
    throw "Bunny Stream API key cannot be empty."
  }

  $temporarySecretsPath = [IO.Path]::GetTempFileName()
  $secretPayload = @{
    SUPABASE_URL             = $supabaseUrl
    SUPABASE_PUBLISHABLE_KEY = $supabasePublishableKey
    BUNNY_STREAM_LIBRARY_ID  = $bunnyLibraryId
    BUNNY_STREAM_API_KEY     = $bunnyApiKey
  } | ConvertTo-Json
  $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
  [IO.File]::WriteAllText($temporarySecretsPath, $secretPayload, $utf8WithoutBom)

  $env:CLOUDFLARE_API_TOKEN = $cloudflareToken
  Push-Location $apiDirectory
  try {
    & $wranglerPath deploy --secrets-file $temporarySecretsPath
    if ($LASTEXITCODE -ne 0) {
      throw "Wrangler deployment failed with exit code $LASTEXITCODE."
    }
  }
  finally {
    Pop-Location
  }
}
finally {
  if ($bunnyApiKeyPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bunnyApiKeyPointer)
  }
  $bunnyApiKey = $null
  $secureBunnyApiKey = $null

  if (
    $temporarySecretsPath -and
    (Test-Path -LiteralPath $temporarySecretsPath) -and
    [IO.Path]::GetFullPath($temporarySecretsPath).StartsWith([IO.Path]::GetTempPath())
  ) {
    Remove-Item -LiteralPath $temporarySecretsPath -Force
  }

  if ([string]::IsNullOrEmpty($originalCloudflareToken)) {
    Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
  }
  else {
    $env:CLOUDFLARE_API_TOKEN = $originalCloudflareToken
  }
}
