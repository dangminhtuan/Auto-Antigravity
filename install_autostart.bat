@echo off
cd /d "%~dp0"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LNK_PATH=%STARTUP_DIR%\AGY_Bridge_AutoStart.lnk"
set "SCRIPT_PATH=%~dp0bridge_server.py"

for /f "delims=" %%I in ('where pythonw 2^>nul') do (
  set "PYW_EXE=%%I"
  goto :found_pyw
)
if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\pythonw.exe" (
  set "PYW_EXE=C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\pythonw.exe"
) else (
  echo [LOI] Khong tim thay pythonw.exe tren may!
  pause
  exit /b 1
)

:found_pyw
echo [AGY-Bridge] Tim thay pythonw: %PYW_EXE%
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%LNK_PATH%'); $s.TargetPath = '%PYW_EXE%'; $s.Arguments = '-B \"\"%SCRIPT_PATH%\"\"'; $s.WorkingDirectory = '%~dp0'; $s.WindowStyle = 7; $s.Description = 'Auto Antigravity 2-Way Extension Bridge (Silent)'; $s.Save()"
if exist "%LNK_PATH%" (
  echo [OK] Da cai dat tu khoi dong ngam cung Windows tai:
  echo      %LNK_PATH%
  echo [INFO] Dang khoi chay ngam ngay bay gio...
  start "" "%PYW_EXE%" -B "%SCRIPT_PATH%"
  echo [DONE] Hoan tat! Khong hien cua so CMD den khi mo may.
) else (
  echo [LOI] Khong tao duoc shortcut Startup!
)
if "%1" NEQ "--silent" pause
