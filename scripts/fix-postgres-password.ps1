$pgHba = "C:\Program Files\PostgreSQL\18\data\pg_hba.conf"
$pgHbaBackup = "$pgHba.babel-backup"
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
$dataDir = "C:\Program Files\PostgreSQL\18\data"
$serviceName = "postgresql-x64-18"

if (-not (Test-Path $pgHba)) {
  throw "No se encontró pg_hba.conf en $pgHba"
}

Copy-Item $pgHba $pgHbaBackup -Force

$content = Get-Content $pgHba -Raw
$content = $content -replace '127\.0\.0\.1/32\s+scram-sha-256', '127.0.0.1/32            trust'
$content = $content -replace '::1/128\s+scram-sha-256', '::1/128                 trust'
Set-Content -Path $pgHba -Value $content -NoNewline

& $pgCtl reload -D $dataDir
if ($LASTEXITCODE -ne 0) {
  Restart-Service $serviceName -Force
  Start-Sleep -Seconds 3
}

& $psql -U postgres -h 127.0.0.1 -d postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
if ($LASTEXITCODE -ne 0) {
  Copy-Item $pgHbaBackup $pgHba -Force
  & $pgCtl reload -D $dataDir
  throw "No se pudo actualizar la contraseña de postgres."
}

$dbExists = & $psql -U postgres -h 127.0.0.1 -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'biblioteca';"
if (-not ($dbExists -match "1")) {
  & $psql -U postgres -h 127.0.0.1 -d postgres -c "CREATE DATABASE biblioteca;"
}

Copy-Item $pgHbaBackup $pgHba -Force
& $pgCtl reload -D $dataDir
if ($LASTEXITCODE -ne 0) {
  Restart-Service $serviceName -Force
}

Write-Host "Listo: usuario postgres / contraseña postgres, base biblioteca creada."
