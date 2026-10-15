@echo off
set "PATH=%LOCALAPPDATA%\Programs\MinGit\cmd;%PATH%"
echo ================================================================
echo    PUSH TO GITHUB & AUTOMATIC CLOUD ANDROID APK BUILDER
echo ================================================================
echo.
echo [1/3] Syncing latest web assets into Android project...
py -3 sync_android_assets.py
echo.
echo [2/3] Staging and committing changes...
git add .
git commit -m "Update Shalom Kerala Stores & Android App"
echo.
echo [3/3] Pushing to https://github.com/johnjoyraj/Shalom...
echo (GitHub Actions will now compile your Android APK automatically!)
git push -u origin main
echo.
echo Done! Check your GitHub Actions tab to download the compiled APK:
echo https://github.com/johnjoyraj/Shalom/actions
echo.
pause
