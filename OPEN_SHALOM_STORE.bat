@echo off
title Shalom Kerala Stores Web Storefront
echo ========================================================
echo Opening Shalom Kerala Stores Web App & POS Server
echo ========================================================
cd /d "%~dp0"
start "" py -3 server.py
exit
