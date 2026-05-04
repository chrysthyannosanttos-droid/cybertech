@echo off
echo =======================================================
echo    CYBERTECH RH - GERADOR DE APP PARA TABLET (PONTO)
echo =======================================================
echo.
echo 1. Instalando dependencias necessarias...
call npm install
echo.
echo 2. Compilando o Frontend (React)...
call npm run build
echo.
echo 3. Gerando o Instalador Electron (.exe)...
echo Este processo pode levar alguns minutos...
call npx electron-builder --win nsis
echo.
echo =======================================================
echo    CONCLUIDO! O instalador esta na pasta:
echo    .\dist_electron\
echo =======================================================
echo.
echo DICA: Para rodar o tablet em Modo Ponto Automativo,
echo crie um atalho do .exe e adicione --terminal no final.
echo.
pause
