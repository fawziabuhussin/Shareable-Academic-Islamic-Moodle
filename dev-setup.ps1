# Zad Alhidaya Platform - Local Development Setup Script
# This script automates the complete local development environment setup
#
# Usage: .\dev-setup.ps1 [-SkipSeed]
#   -SkipSeed: Skip the database seeding step

param(
    [switch]$SkipSeed
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Zad Alhidaya Platform - Dev Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install dependencies
Write-Host "[1/9] Installing dependencies..." -ForegroundColor Yellow
npm i
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Verify PostgreSQL is running
Write-Host "[2/9] Verifying PostgreSQL connection..." -ForegroundColor Yellow
try {
    $pgReady = pg_isready -h localhost -p 5432 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: PostgreSQL does not appear to be running on localhost:5432" -ForegroundColor Red
        Write-Host "Please start PostgreSQL and try again." -ForegroundColor Red
        exit 1
    }
    Write-Host "PostgreSQL is running!" -ForegroundColor Green
} catch {
    Write-Host "Warning: pg_isready not found. Skipping PostgreSQL check." -ForegroundColor Yellow
    Write-Host "Make sure PostgreSQL is running on localhost:5432." -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Copy and configure API environment
Write-Host "[3/9] Setting up API environment..." -ForegroundColor Yellow
$apiEnvPath = "apps/api/.env"
if (Test-Path $apiEnvPath) {
    Write-Host "API .env already exists - skipping copy and defaults." -ForegroundColor Gray
} else {
    Copy-Item "env-templates/api.env" $apiEnvPath -Force

    # Update API .env file with local development values
    $apiEnvContent = Get-Content $apiEnvPath -Raw
    $apiEnvContent = $apiEnvContent -replace 'DATABASE_URL=.*', 'DATABASE_URL=postgresql://postgres:your_password@localhost:5432/zad_alhidaya'
    $apiEnvContent = $apiEnvContent -replace 'FRONTEND_URL=.*', 'FRONTEND_URL=http://localhost:3000'
    $apiEnvContent = $apiEnvContent -replace 'NODE_ENV=.*', 'NODE_ENV=development'
    # For local dev, DIRECT_URL = DATABASE_URL (no pooler)
    $apiEnvContent += "`nDIRECT_URL=postgresql://postgres:your_password@localhost:5432/zad_alhidaya`n"
    Set-Content $apiEnvPath $apiEnvContent
    Write-Host "API environment created - update DATABASE_URL password in apps/api/.env" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Copy and configure Web environment
Write-Host "[4/9] Setting up Web environment..." -ForegroundColor Yellow
$webEnvPath = "apps/web/.env.local"
if (Test-Path $webEnvPath) {
    Write-Host "Web .env.local already exists - skipping copy and defaults." -ForegroundColor Gray
} else {
    Copy-Item "env-templates/web.env" $webEnvPath -Force

    # Update Web .env.local file with local development values
    $webEnvContent = Get-Content $webEnvPath -Raw
    $webEnvContent = $webEnvContent -replace 'NEXT_PUBLIC_API_URL=.*', 'NEXT_PUBLIC_API_URL=http://localhost:3001'
    $webEnvContent = $webEnvContent -replace 'NEXT_PUBLIC_FRONTEND_URL=.*', 'NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000'
    Set-Content $webEnvPath $webEnvContent
    Write-Host "Web environment created!" -ForegroundColor Green
}
Write-Host ""

# Step 5: Generate Prisma client
Write-Host "[5/9] Generating Prisma client..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Prisma generate failed" -ForegroundColor Red
    exit 1
}
Write-Host "Prisma client generated!" -ForegroundColor Green
Write-Host ""

# Step 6: Ask user if they want to reset the database
Write-Host "[6/9] Database reset check..." -ForegroundColor Yellow
$resetDb = Read-Host "Do you want to clear all database data and re-apply migrations? (y/N)"
if ($resetDb -eq 'y' -or $resetDb -eq 'Y') {
    Write-Host 'Resetting database (drop, re-create, apply all migrations)...' -ForegroundColor Yellow
    Push-Location apps/api
    npx prisma migrate reset --force
    $resetExit = $LASTEXITCODE
    Pop-Location
    if ($resetExit -ne 0) {
        Write-Host "Error: Database reset failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "Database reset completed!" -ForegroundColor Green
} else {
    Write-Host "Skipping database reset." -ForegroundColor Gray
}
Write-Host ""

# Step 7: Run database migrations
Write-Host "[7/9] Running database migrations..." -ForegroundColor Yellow
npm run db:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Database migration failed" -ForegroundColor Red
    exit 1
}
Write-Host "Database migrations completed!" -ForegroundColor Green
Write-Host ""

# Step 8: Seed the database
if ($SkipSeed) {
    Write-Host '[8/9] Skipping database seeding (-SkipSeed flag provided)' -ForegroundColor Gray
} else {
    Write-Host "[8/9] Seeding database..." -ForegroundColor Yellow
    npm run db:seed
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Database seeding failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "Database seeded!" -ForegroundColor Green
}
Write-Host ""

# Step 9: Start development server
Write-Host "[9/9] Starting development server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete! Starting servers..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Web:  http://localhost:3000" -ForegroundColor Green
Write-Host "  API:  http://localhost:3001" -ForegroundColor Green
Write-Host ""

# Open browser after a short delay to allow server to start
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:3000"
} | Out-Null

npm run dev
