@echo off

REM Startup script for Ollama with CORS enabled for local development (Windows)

echo Starting Ollama with CORS enabled for localhost:5173...
echo.
echo If you encounter any issues, make sure Ollama is installed:
echo   Download from: https://ollama.ai
echo.

REM Set CORS origins to allow requests from the React dev server
set OLLAMA_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

REM Start Ollama
ollama serve
