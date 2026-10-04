@echo off
setlocal
title Ivan is Ivan Mixer - starting
rem ============================================================
rem  Ivan is Ivan Mixer - the desktop button.
rem  1) Installs the newest ivan-is-ivan-mixer*.zip from Downloads
rem     (only when it is new) into %USERPROFILE%\IvanIsIvanMixer
rem     Your library (data folder) and Stream Deck key are kept.
rem  2) Puts an "Ivan is Ivan Mixer" button on the desktop.
rem  3) Starts the mixer.
rem ============================================================
set "APP=%USERPROFILE%\IvanIsIvanMixer"
set "DL=%USERPROFILE%\Downloads"
set "STAMPFILE=%APP%\installed-from.txt"
set "ZIP="

echo.
echo   IVAN is IVAN - Mixer
echo   ====================

rem --- find the newest mixer zip (Downloads first, then next to this file)
for /f "delims=" %%f in ('dir /b /a-d /o:-d "%DL%\ivan-is-ivan-mixer*.zip" 2^>nul') do if not defined ZIP set "ZIP=%DL%\%%f"
if not defined ZIP for /f "delims=" %%f in ('dir /b /a-d /o:-d "%~dp0ivan-is-ivan-mixer*.zip" 2^>nul') do if not defined ZIP set "ZIP=%~dp0%%f"

if not defined ZIP goto start

rem --- is it already installed?  (compare name + date + size)
for %%A in ("%ZIP%") do set "STAMP=%%~nxA %%~tA %%~zA"
set "OLD="
if exist "%STAMPFILE%" set /p OLD=<"%STAMPFILE%"
if "%OLD%"=="%STAMP%" goto start

echo   Installing: %ZIP%
set "TMPX=%TEMP%\ivan-mixer-unpack-%RANDOM%%RANDOM%"
mkdir "%TMPX%" >nul 2>nul
call tar -xf "%ZIP%" -C "%TMPX%" >nul 2>nul
if errorlevel 1 call :unzip_ps
if not exist "%TMPX%\ivan-is-ivan-mixer\app.js" (
  echo   [!] Could not unpack the zip. Is it a complete download?
  rmdir /s /q "%TMPX%" >nul 2>nul
  goto start
)
if not exist "%APP%" mkdir "%APP%"
rem copy over the old version; data\ and control-key.txt are not in the zip, so they stay
xcopy "%TMPX%\ivan-is-ivan-mixer\*" "%APP%\" /E /Y /Q >nul
rmdir /s /q "%TMPX%" >nul 2>nul
> "%STAMPFILE%" echo %STAMP%
set "NEWVER="
if exist "%APP%\VERSION" set /p NEWVER=<"%APP%\VERSION"
echo   Installed version %NEWVER%

:start
if not exist "%APP%\start-windows.bat" (
  echo.
  echo   [!] The mixer is not installed yet.
  echo   Download ivan-is-ivan-mixer-vX.Y.Z.zip into your Downloads folder,
  echo   then click this button again.
  echo.
  pause
  exit /b 1
)

rem --- keep a copy of this button in the app folder (older zips do not include it)
if /i not "%~dp0"=="%APP%\" copy /y "%~f0" "%APP%\Ivan Mixer.bat" >nul 2>nul

rem --- desktop button (made once; points at the installed copy of this file)
call :make_shortcut
rem made (or refreshed) every start, so it always points here and shows the Ivan icon
set "ICON=%SystemRoot%\System32\SndVol.exe,0"
if exist "%APP%\ivan-mixer.ico" set "ICON=%APP%\ivan-mixer.ico,0"
call powershell -NoProfile -ExecutionPolicy Bypass -Command "$d=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d 'Ivan is Ivan Mixer.lnk')); $s.TargetPath=(Join-Path $env:APP 'Ivan Mixer.bat'); $s.WorkingDirectory=$env:APP; $s.IconLocation=$env:ICON; $s.Description='Install the newest download and start the Ivan is Ivan mixer'; $s.Save()" >nul 2>nul
if not errorlevel 1 if not exist "%APP%\desktop-button-made.txt" (
  > "%APP%\desktop-button-made.txt" echo made
  echo   Desktop button "Ivan is Ivan Mixer" created.
)
exit /b
