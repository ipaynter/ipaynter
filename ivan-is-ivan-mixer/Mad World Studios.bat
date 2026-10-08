@echo off
title Mad World Studios - Late Night with Ivan
rem Double-click: installs or updates Late Night with Ivan, then starts it.
rem The work is done by launcher.ps1 next to this file (plain text you can read).
rem One block: Windows reads it all at once, so an update that replaces this file cannot confuse it.
(
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher.ps1"
  if errorlevel 1 pause
  exit /b
)
