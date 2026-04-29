# Script de Sincronização em Tempo Real - CyberTech RH
# Este script monitora mudanças e faz o push automático para o GitHub

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AUTO-SYNC ATIVADO: MONITORANDO MUDANÇAS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Pressione Ctrl+C para parar."

while($true) {
    # Verifica se há mudanças no git
    $status = git status --porcelain
    
    if ($status) {
        Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] Alterações detectadas! Sincronizando..." -ForegroundColor Yellow
        
        git add .
        git commit -m "Auto-sync: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git push origin main
        
        Write-Host "[OK] Sincronizado com sucesso!" -ForegroundColor Green
        Write-Host "Aguardando próxima mudança..." -ForegroundColor Gray
    }
    
    # Espera 30 segundos antes da próxima verificação
    Start-Sleep -Seconds 30
}
