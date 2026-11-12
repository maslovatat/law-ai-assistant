@echo off
echo === AI Legal Assistant: setup ===
set PY=python
where python >nul 2>nul
if errorlevel 1 set PY=py -3
%PY% --version
if errorlevel 1 goto nopython
if not exist .venv\Scripts\activate.bat %PY% -m venv .venv
if errorlevel 1 goto fail
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if errorlevel 1 goto fail
if not exist .env copy .env.example .env >nul
if exist frontend\dist\index.html goto done
where npm >nul 2>nul
if errorlevel 1 goto nonode
cd frontend
call npm install
call npm run build
cd ..
goto done
:nonode
echo WARNING: frontend\dist is missing and Node.js was not found. Install Node.js 18+ and run setup.bat again.
goto done
:nopython
echo Python was not found. Install Python 3.10+ from python.org and tick "Add python.exe to PATH".
pause
exit /b 1
:fail
echo Installation failed. See messages above.
pause
exit /b 1
:done
echo.
echo Done. Now run run.bat
pause
