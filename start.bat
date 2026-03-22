@echo off
setlocal
title Executor - CyberTech RH

echo ==================================================
echo      EXECUTOR CYBERTECH RH - HR-HUB PLUS
echo      IP REDE: 192.168.18.19
echo ==================================================
echo.

:: Verifica se a pasta node_modules existe
if not exist "node_modules\" (
    echo [AVISO] Dependencias nao encontradas.
    echo Executando o instalador primeiro...
    echo.
    call setup.bat
)

echo [✓] Servidor pronto!
echo.
echo Para acessar de OUTRAS MAQUINAS na mesma rede, use:
echo >> Local (Wi-Fi): http://192.168.18.19:8080
echo >> Radmin VPN:   http://26.205.25.209:8080
echo.
echo O sistema abrira automaticamente no seu navegador local em:
echo http://localhost:8080
echo.

:: Inicia o servidor e tenta abrir o navegador
start http://localhost:8080
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Ocorreu um problema ao iniciar o servidor.
    pause
    exit /b 1
)

pause
