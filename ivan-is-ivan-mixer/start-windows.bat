@echo off
title Ivan is Ivan - Live Mixer
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
