@echo off
setlocal
title Shalom Kerala Stores - Android App Builder
color 0A

echo ================================================================
echo       SHALOM KERALA STORES - ANDROID APP BUILD AND SYNC
echo ================================================================
echo.

echo [1/3] Synchronizing storefront assets (index.html, css, js, images)...
py -3 sync_android_assets.py
if errorlevel 1 (
    echo [!] Python asset sync failed. Please check Python installation.
) else (
    echo [OK] Storefront assets synchronized into Android app.
)
echo.

echo [2/3] Checking for local Java and Android SDK...
where java >nul 2>&1
if errorlevel 1 goto no_java

echo [OK] Java detected. Compiling Android APK with Gradle...
pushd android
call gradlew.bat assembleDebug
if errorlevel 1 (
    echo [!] Gradle build encountered an issue. Open android folder in Android Studio.
    popd
    goto end_section
)
echo.
echo ================================================================
echo [SUCCESS] APK compiled successfully!
echo Location: android\app\build\outputs\apk\debug\app-debug.apk
echo ================================================================
if exist app\build\outputs\apk\debug\app-debug.apk (
    explorer app\build\outputs\apk\debug
)
popd
goto end_section

:no_java
echo [INFO] Local Java/Gradle not found in PATH.
echo.
echo 2 easy ways to get your APK:
echo.
echo   WAY 1: Cloud Build with GitHub Actions
echo     Run PUSH_TO_GITHUB.bat to upload to your repository.
echo     GitHub will automatically build the APK in 2 minutes
echo     and provide a 1-click download link.
echo.
echo   WAY 2: Android Studio
echo     Open Android Studio, select "Open Project", and choose the
echo     "android" folder inside SHALOM.
echo.

:end_section
echo [3/3] Progressive Web App (PWA) is also ready!
echo Open index.html in Google Chrome on your Android phone and tap
echo "Install App" or "Add to Home Screen" for instant app installation.
echo.
pause
