@echo off
echo =======================================================
echo    CYBERTECH RH - PREPARADOR DE APP ANDROID
echo =======================================================
echo.
echo 1. Compilando o Frontend (React)...
call npm run build
echo.
echo 2. Sincronizando arquivos com o projeto Android...
call npx cap sync android
echo.
echo 3. Abrindo o Android Studio para gerar o APK...
echo.
echo INSTRUCOES NO ANDROID STUDIO:
echo 1. Aguarde o Gradle terminar de carregar (barra na parte inferior).
echo 2. Vá no menu: Build -> Build Bundle(s) / APK(s) -> Build APK(s).
echo 3. Quando terminar, aparecera um aviso no canto inferior direito. 
echo    Clique em 'locate' para pegar o seu arquivo .apk.
echo.
call npx cap open android
echo.
pause

