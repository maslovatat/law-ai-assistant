@echo off
if not exist .venv\Scripts\activate.bat goto nosetup
call .venv\Scripts\activate.bat
if not exist .env copy .env.example .env >nul
echo Starting server at http://127.0.0.1:8000  (stop: Ctrl+C)
start "" http://127.0.0.1:8000
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
exit /b 0
:nosetup
echo Run setup.bat first.
pause
exit /b 1
