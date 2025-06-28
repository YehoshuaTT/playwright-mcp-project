# Stop Playwright MCP Server
Write-Host "Stopping Playwright MCP Server..." -ForegroundColor Yellow

docker-compose -f docker/docker-compose.yml down

Write-Host "Server stopped!" -ForegroundColor Green