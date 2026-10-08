@echo off
setlocal
title Late Night with Ivan - DJ Board
cd /d "%~dp0"
set "APPDIR=%~dp0"
set "LOG=%~dp0start-log.txt"

echo.
echo   LATE NIGHT with IVAN - DJ Board
echo   =========================
echo   Folder: %APPDIR%
echo.

> "%LOG%" echo Late Night with Ivan - DJ Board - start log - %DATE% %TIME%
>>"%LOG%" ver
>>"%LOG%" echo Folder: %APPDIR%
if exist "%APPDIR%VERSION" for /f "usebackq delims=" %%v in ("%APPDIR%VERSION") do >>"%LOG%" echo Version: %%v

where powershell >nul 2>nul
if errorlevel 1 goto nopowershell

rem Files from a downloaded zip carry a "came from the internet" mark. Clear it so Windows lets them run.
call powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -LiteralPath $env:APPDIR -Recurse -File | Unblock-File" >nul 2>nul
>>"%LOG%" 2>&1 call powershell -NoProfile -ExecutionPolicy Bypass -Command "'PowerShell ' + $PSVersionTable.PSVersion; Get-ExecutionPolicy -List | Out-String"

echo   Starting... Chrome opens in a moment.
echo   Keep this window open during the show. Close it to stop the mixer.
echo.
call powershell -NoProfile -ExecutionPolicy Bypass -File "%APPDIR%serve.ps1"
set "RC=%ERRORLEVEL%"
>>"%LOG%" echo serve.ps1 finished, exit code %RC%
if "%RC%"=="0" goto done
echo.
echo   [!] The mixer stopped with an error. The red text above says why.
goto python

:nopowershell
echo   [!] Windows PowerShell was not found on this computer.
>>"%LOG%" echo PowerShell: NOT FOUND

:python
where py >nul 2>nul
if errorlevel 1 goto fail
echo   Trying Python instead...
>>"%LOG%" echo Trying Python (py -3)
call py -3 "%APPDIR%serve.py"
if errorlevel 1 goto fail
goto done

:fail
>>"%LOG%" echo RESULT: could not start
echo.
echo   Could not start the mixer.
echo   Please send a photo or screenshot of this window,
echo   and the file start-log.txt from this folder.

:done
echo.
pause
