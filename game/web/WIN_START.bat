@echo off
setlocal

echo Checking system environment...

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js not detected, please install Node.js first
    echo You can visit https://nodejs.org/ to download
    echo.
    set /p "open_browser=Would you like to open the Node.js download page? (y/n): "
    if /i "%open_browser%"=="y" (
        start https://nodejs.org/en/download/
    )
    echo.
    echo After installation, please rerun this startup file
    pause
    exit /b 1
)

:: Check if http-server is installed
call npm list -g http-server >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Installing http-server...
    call npm install -g http-server
    if %ERRORLEVEL% neq 0 (
        echo Failed to install http-server, please check your network connection or run as administrator
        pause
        exit /b 1
    )
)

:: Display startup information
echo Starting Pet World game server...
echo The browser will automatically open after the server starts
echo To access manually, open the browser and go to http://localhost:8080
echo Closing this window will stop the server

:: Get the current script directory
cd /d "%~dp0"

:: Start the server and run in the background
start "" cmd /c "http-server -p 8080 -c-1"

:: Wait for the server to start
timeout /t 2 /nobreak >nul

:: Open the browser
start http://localhost:8080

echo Server started, closing this window will stop the server
echo.
pause 