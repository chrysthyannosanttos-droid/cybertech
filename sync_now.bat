@echo off
cd /d %~dp0
echo ==========================================
echo   Sincronizando CyberTech RH para Online
echo ==========================================
echo.
git add .
git commit -m "Implementacao Ponto Digital e Ajustes de Ativos"
git push
echo.
echo ==========================================
echo   CONCLUIDO! Verifique seu site no Vercel.
echo ==========================================
pause
