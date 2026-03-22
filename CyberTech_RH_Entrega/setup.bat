@echo off
setlocal
title Instalador - CyberTech RH

echo ==================================================
echo      INSTALADOR CYBERTECH RH - HR-HUB PLUS
echo ==================================================
echo.

:: Verifica se o Node.js esta instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale o Node.js em: https://nodejs.org/
    pause
    exit /b 1
)

echo [✓] Node.js detectado.
echo.
echo Instalando dependencias do projeto...
echo Isso pode levar alguns minutos dependendo da sua internet.
echo.

call npm install

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
)

echo.
echo ==================================================
echo   INSTALACAO CONCLUIDA COM SUCESSO!
echo ==================================================
echo.
echo Agora voce pode usar o "start.bat" para rodar o app.
echo.
pause
