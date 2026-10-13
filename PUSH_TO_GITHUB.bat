@echo off
set "PATH=%LOCALAPPDATA%\Programs\MinGit\cmd;%PATH%"
echo Pushing Shalom website to https://github.com/johnjoyraj/Shalom...
git push -u origin main
echo.
pause
