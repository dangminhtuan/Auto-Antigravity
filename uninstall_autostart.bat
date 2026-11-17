@echo off
set "LNK_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\AGY_Bridge_AutoStart.lnk"

if exist "%LNK_PATH%" (
  del /f /q "%LNK_PATH%"
  echo [OK] Da go bo tu khoi dong ngam AGY_Bridge_AutoStart.lnk khoi Windows Startup!
) else (
  echo [INFO] Khong thay file tu khoi dong nao trong Startup.
)
if "%1" NEQ "--silent" pause
