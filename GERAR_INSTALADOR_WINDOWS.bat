@echo off
color 0B
echo =======================================================
echo    GERADOR DE INSTALADOR DESKTOP - CYBERTECH RH
echo =======================================================
echo.
echo 1. Limpando instalacoes anteriores...
if exist dist-electron rmdir /s /q dist-electron

echo.
echo 2. Compilando o projeto React...
call npm run build

echo.
echo 3. Gerando o instalador .EXE (Windows)...
call npm run electron:build

echo.
echo =======================================================
echo    SUCESSO! O instalador foi gerado na pasta:
echo    hr-hub-plus\dist-electron\CyberTech RH Setup...
echo =======================================================
echo.
pause
