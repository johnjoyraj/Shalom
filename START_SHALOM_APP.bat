@echo off
title Shalom Kerala Stores Web App & POS Server
color 0A
echo ========================================================
echo  SHALOM KERALA STORES -- E-COMMERCE, POS & INVENTORY
echo  Starting High-Performance Local Server on Port 8085
echo ========================================================
cd /d "%~dp0"
py -3 server.py
if errorlevel 1 (
    echo Python not found. Falling back to default browser...
    start "" "%~dp0index.html"
)
pause
