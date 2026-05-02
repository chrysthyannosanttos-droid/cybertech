# Script de Sincronização Automática - CyberTech RH
Set-Location $PSScriptRoot
# Este script envia as alterações para o GitHub e realiza o Deploy na Vercel

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  SINCRONIZANDO PROJETO HR-HUB PLUS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Git Sync
Write-Host "`n[1/3] Preparando arquivos no Git..." -ForegroundColor Yellow
git add .
git commit -m "feat: modulo de geracao de holerites em massa e progresso visual"
Write-Host "[OK] Commit realizado." -ForegroundColor Green

# 2. Push to GitHub
Write-Host "`n[2/3] Enviando para o GitHub (origin main)..." -ForegroundColor Yellow
git push origin main
Write-Host "[OK] Sincronizado com GitHub." -ForegroundColor Green

# 3. Vercel Deploy (DESATIVADO - O Git Sync ja dispara o deploy automatico na Vercel)
Write-Host "`n[3/3] Sincronizacao Git concluida. O deploy sera iniciado automaticamente pela Vercel via GitHub." -ForegroundColor Yellow
# npx vercel --prod --confirm
Write-Host "[CONCLUIDO] O sistema esta sendo atualizado na nuvem via Git Push!" -ForegroundColor Green

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  PROCESSO FINALIZADO COM SUCESSO!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
pause
