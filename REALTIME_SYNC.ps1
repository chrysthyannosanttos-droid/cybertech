# Script de Sincronização em Tempo Real (ULTRA) - CyberTech RH
# Monitora a pasta de desenvolvimento e sincroniza com a pasta de deploy automaticamente

$sourcePath = "C:\Users\tisup\Desktop\projeto\hr-hub-plus"
$deployPath = "C:\Users\tisup\Desktop\barber-hub-pro-main"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  ULTRA-SYNC ATIVADO: DESENVOLVIMENTO -> PRODUÇÃO" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Monitorando: $sourcePath"
Write-Host "Sincronizando para: $deployPath"
Write-Host "Pressione Ctrl+C para parar."

while($true) {
    # 1. Verifica se há mudanças locais
    $status = git -C $sourcePath status --porcelain
    
    if ($status) {
        Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] Alterações detectadas! Iniciando Sincronização..." -ForegroundColor Yellow
        
        # A. Copia para a pasta de deploy
        Write-Host "-> Copiando arquivos para pasta de deploy..." -ForegroundColor Gray
        xcopy "$sourcePath\src" "$deployPath\src" /E /I /Y /D | Out-Null
        copy "$sourcePath\package.json" "$deployPath\package.json" /Y | Out-Null
        
        # B. Git Push no Projeto de Desenvolvimento
        Write-Host "-> Fazendo Push no repositório de Desenvolvimento..." -ForegroundColor Gray
        git -C $sourcePath add .
        git -C $sourcePath commit -m "Auto-sync Dev: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git -C $sourcePath push origin main
        
        # C. Git Push no Projeto de Deploy (se existir)
        Write-Host "-> Fazendo Push no repositório de Deploy..." -ForegroundColor Gray
        git -C $deployPath add .
        git -C $deployPath commit -m "Auto-sync Prod: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        # Tentativa de push, mas não trava se falhar
        git -C $deployPath push origin main
        
        Write-Host "[OK] Tudo sincronizado e pronto para Vercel!" -ForegroundColor Green
        Write-Host "Aguardando próxima mudança..." -ForegroundColor Gray
    }
    
    # Verifica a cada 15 segundos para ser "tempo real"
    Start-Sleep -Seconds 15
}
