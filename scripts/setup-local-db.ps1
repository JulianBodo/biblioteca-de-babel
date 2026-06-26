param(
  [Parameter(Mandatory = $true)]
  [string]$Password,

  [string]$DbHost = "localhost",
  [int]$Port = 5432,
  [string]$User = "postgres",
  [string]$Database = "biblioteca"
)

$ErrorActionPreference = "Stop"

$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
if (-not (Test-Path $psql)) {
  $found = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) {
    $psql = $found.FullName
  } else {
    throw "No se encontró psql.exe. Instalá PostgreSQL o agregá psql al PATH."
  }
}

$env:PGPASSWORD = $Password

Write-Host "Verificando conexión a PostgreSQL en ${DbHost}:${Port}..."
& $psql -U $User -h $DbHost -p $Port -d postgres -c "SELECT version();" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "No se pudo conectar. Revisá usuario, contraseña y que el servicio PostgreSQL esté activo."
}

$dbExists = & $psql -U $User -h $DbHost -p $Port -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$Database';"
if (-not ($dbExists -match "1")) {
  Write-Host "Creando base de datos '$Database'..."
  & $psql -U $User -h $DbHost -p $Port -d postgres -c "CREATE DATABASE $Database;"
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo crear la base de datos '$Database'."
  }
} else {
  Write-Host "La base de datos '$Database' ya existe."
}

$encodedPassword = [uri]::EscapeDataString($Password)
$url = "postgresql://${User}:${encodedPassword}@${DbHost}:${Port}/${Database}"

Write-Host ""
Write-Host "Base lista. Actualizá tu .env con:"
Write-Host "DATABASE_URL=`"$url`""
Write-Host ""
Write-Host "Luego ejecutá:"
Write-Host "  npx prisma migrate reset"
Write-Host "  npm run db:seed"

Remove-Item Env:PGPASSWORD
