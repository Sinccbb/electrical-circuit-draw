@echo off
title CircuitLab Web
cd /d "%~dp0"
echo ======================================================
echo Menjalankan CircuitLab Web...
echo Buka di browser Anda: http://localhost:3000/index.html
echo ======================================================
start http://localhost:3000/index.html
node server.js
pause
