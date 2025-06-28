# Setup Playwright MCP Project
Write-Host "🎭 Setting up Playwright MCP Project..." -ForegroundColor Green

# Create project structure
$projectName = "playwright-mcp-project"
New-Item -ItemType Directory -Path $projectName -Force
Set-Location $projectName

# Create subdirectories
@("docker", "server", "claude-config", "scripts", "screenshots") | ForEach-Object {
    New-Item -ItemType Directory -Path $_ -Force
}

Write-Host " Project structure created!" -ForegroundColor Green

# Check Docker Desktop
$dockerRunning = docker version 2>$null
if ($dockerRunning) {
    Write-Host "Docker Desktop is running" -ForegroundColor Green
} else {
    Write-Host "Docker Desktop is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check Node.js
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

Write-Host "Setup complete! Run start.ps1 to start the server." -ForegroundColor Green