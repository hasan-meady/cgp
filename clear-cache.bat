@echo off
echo === CGP Cache Clear Script ===
echo.
echo Clearing WordPress cache directories...

cd /d "%~dp0"

if exist "wp-content\cache" (
    echo Clearing wp-content\cache...
    del /Q "wp-content\cache\*.*" 2>nul
    echo ✓ Cache directory cleared
) else (
    echo ✓ No cache directory found
)

echo.
echo === Cache Clear Complete ===
echo.
echo IMPORTANT: Please hard refresh your browser:
echo - Windows: Ctrl + F5 or Ctrl + Shift + R
echo - Mac: Cmd + Shift + R
echo.
echo Also clear browser cache if issues persist:
echo - Chrome: Ctrl+Shift+Delete
echo - Firefox: Ctrl+Shift+Delete
echo - Edge: Ctrl+Shift+Delete
echo.
pause