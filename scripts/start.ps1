# Start Playwright MCP Server
Write-Host "Starting Playwright MCP Server..." -ForegroundColor Green

# Check if Docker Desktop is running
$dockerRunning = docker version 2>$null
if (-not $dockerRunning) {
    Write-Host "Docker Desktop is not running. Starting Docker Desktop..." -ForegroundColor Red
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    Write-Host "Waiting for Docker Desktop to start..." -ForegroundColor Yellow
    
    do {
        Start-Sleep -Seconds 5
        $dockerRunning = docker version 2>$null
    } while (-not $dockerRunning)
    
    Write-Host "Docker Desktop is now running!" -ForegroundColor Green
}

# Build and start containers
Write-Host "Building Docker containers..." -ForegroundColor Yellow
docker-compose -f docker/docker-compose.yml build

Write-Host "Starting Playwright MCP Server..." -ForegroundColor Yellow
docker-compose -f docker/docker-compose.yml up -d

# Wait for server to be ready
Write-Host "Waiting for server to be ready..." -ForegroundColor Yellow
do {
    $response = try { 
        Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 2
        $true 
    } catch { 
        $false 
    }
    if (-not $response) {
        Start-Sleep -Seconds 2
    }
} while (-not $response)

Write-Host "Playwright MCP Server is running!" -ForegroundColor Green
Write-Host ""
Write-Host "   Server URLs:" -ForegroundColor Cyan
Write-Host "   HTTP API: http://localhost:3000" -ForegroundColor White
Write-Host "   WebSocket: ws://localhost:3001" -ForegroundColor White
Write-Host "   Health Check: http://localhost:3000/health" -ForegroundColor White
Write-Host ""
Write-Host "   Ready for Claude Desktop connection!" -ForegroundColor Green

# Test the server
Write-Host " Testing server..." -ForegroundColor Yellow
$testResult = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing
Write-Host "Server response:" -ForegroundColor Yellow
Write-Host $testResult.Content
$healthData = $testResult.Content | ConvertFrom-Json
Write-Host "   Status: $($healthData.status)" -ForegroundColor White
Write-Host "   Browser: $($healthData.browser)" -ForegroundColor White