param([string]$BaseUrl = 'http://localhost:5132')

$ErrorActionPreference = 'Stop'
$testEmail = "smoke-$([Guid]::NewGuid().ToString('N'))@example.com"
$testPassword = 'Test1!' + [Guid]::NewGuid().ToString('N')

function Request($Method, $Path, $Body, $Token, $Expected) {
    $arguments = @{
        Uri = "$BaseUrl$Path"
        Method = $Method
        SkipHttpErrorCheck = $true
        TimeoutSec = 30
    }
    if ($null -ne $Body) {
        $arguments.ContentType = 'application/json'
        $arguments.Body = ConvertTo-Json $Body
    }
    if ($Token) { $arguments.Headers = @{ Authorization = "Bearer $Token" } }
    $response = Invoke-WebRequest @arguments
    if ([int]$response.StatusCode -ne $Expected) {
        throw "$Method $Path expected $Expected, received $($response.StatusCode)."
    }
    Write-Host "PASS $Method $Path ($Expected)"
    if ($response.Content) { return $response.Content | ConvertFrom-Json }
}

$null = Request GET /api/me $null $null 401
$null = Request POST /auth/register @{ email = 'invalid'; password = 'weak' } $null 400
$credentials = @{ email = $testEmail; password = $testPassword }
$null = Request POST /auth/register $credentials $null 200
$null = Request POST /auth/register $credentials $null 400
$null = Request POST /auth/login @{ email = $testEmail; password = 'Wrong1!' } $null 401
$tokens = Request POST /auth/login $credentials $null 200
if (-not $tokens.accessToken -or -not $tokens.refreshToken) { throw 'Missing tokens.' }
$account = Request GET /api/me $null $tokens.accessToken 200
if ($account.email -ne $testEmail) { throw 'Incorrect account returned.' }
$null = Request POST /auth/refresh @{ refreshToken = 'invalid' } $null 401
$renewed = Request POST /auth/refresh @{ refreshToken = $tokens.refreshToken } $null 200
$null = Request GET /api/me $null $renewed.accessToken 200
# Failed logins accumulate on the account, including the earlier failure.
1..5 | ForEach-Object {
    $null = Request POST /auth/login @{ email = $testEmail; password = 'Wrong1!' } $null 401
}
$null = Request POST /auth/login $credentials $null 401
$null = Request POST /auth/refresh @{ refreshToken = $renewed.refreshToken } $null 401
Write-Host "Auth smoke test passed. Disposable test account: $testEmail"
