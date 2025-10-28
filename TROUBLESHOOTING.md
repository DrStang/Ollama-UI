# Troubleshooting Guide

## Connection Issues

### Error: `Failed to load resource: net::ERR_CONNECTION_REFUSED`

This means the application cannot connect to your Ollama server. Here's how to fix it:

#### 1. Check if Ollama is Installed

```bash
ollama --version
```

If you get "command not found", you need to install Ollama:
- Download from: https://ollama.ai

#### 2. Start Ollama Server

**Option A: Use the provided startup scripts**

Linux/Mac:
```bash
./start-ollama.sh
```

Windows:
```batch
start-ollama.bat
```

**Option B: Manual start with CORS**

Linux/Mac:
```bash
OLLAMA_ORIGINS="http://localhost:5173" ollama serve
```

Windows (PowerShell):
```powershell
$env:OLLAMA_ORIGINS="http://localhost:5173"
ollama serve
```

Windows (Command Prompt):
```cmd
set OLLAMA_ORIGINS=http://localhost:5173
ollama serve
```

#### 3. Verify Ollama is Running

Open a new terminal and run:
```bash
curl http://localhost:11434/api/tags
```

You should see a JSON response with your models.

#### 4. Check CORS Configuration

If Ollama is running but you still get connection errors, CORS might not be configured properly.

**Temporary Solution:**
Stop Ollama and restart it with CORS enabled (see step 2).

**Permanent Solution (Linux/Mac):**
Add to your `~/.bashrc` or `~/.zshrc`:
```bash
export OLLAMA_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

Then reload:
```bash
source ~/.bashrc  # or source ~/.zshrc
ollama serve
```

**Permanent Solution (Windows):**
Set as a system environment variable:
1. Search for "Environment Variables" in Windows
2. Add new system variable:
   - Name: `OLLAMA_ORIGINS`
   - Value: `http://localhost:5173,http://127.0.0.1:5173`
3. Restart terminal and run `ollama serve`

## Port Issues

### Ollama is running on a different port

If your Ollama server is on a different port or host, update the `.env` file:

```env
VITE_OLLAMA_BASE_URL=http://localhost:YOUR_PORT
```

Then restart the dev server:
```bash
npm run dev
```

### Port 5173 is already in use

If Vite can't start on port 5173:

1. Stop the process using that port, OR
2. Vite will automatically use the next available port (e.g., 5174)
3. Update your OLLAMA_ORIGINS to match the new port

## Model Issues

### "No models available"

You need to pull at least one model:

```bash
# Quick start with a small model
ollama pull phi

# Or pull other popular models
ollama pull llama2
ollama pull mistral
ollama pull codellama
```

### Model pull is very slow

This is normal! AI models are large:
- `phi`: ~2.7 GB
- `llama2`: ~3.8 GB
- `llama2:13b`: ~7.4 GB
- `codellama`: ~3.8 GB

The progress bar in the UI will show download progress.

### Model pull fails

Common reasons:
1. **Not enough disk space** - Check you have enough free space
2. **Network timeout** - Try again, or use a faster internet connection
3. **Ollama server restarted** - Restart the pull operation

## Chat Issues

### Chat responses are slow

This is normal, especially for larger models:
- Smaller models (phi, mistral) are faster
- Larger models (llama2:13b) are more accurate but slower
- Response time depends on your hardware (CPU/GPU)

### Chat not responding at all

1. **Check model is installed:**
   ```bash
   ollama list
   ```

2. **Try the model manually:**
   ```bash
   ollama run llama2 "Hello, how are you?"
   ```

3. **Check browser console** for error messages (F12 → Console tab)

4. **Verify Ollama is still running:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

## Browser Issues

### localStorage full error

Chat history is stored in browser localStorage. If you get errors:

1. Clear old chat sessions through the UI
2. Or clear all data:
   - Open DevTools (F12)
   - Go to Application → Local Storage
   - Find `ollama-chat-sessions`
   - Delete it

### CORS errors in browser console

Make sure you started Ollama with the OLLAMA_ORIGINS environment variable set (see Connection Issues above).

## Platform-Specific Issues

### Linux: Permission denied

If you get permission errors:
```bash
sudo chmod +x start-ollama.sh
./start-ollama.sh
```

### Mac: "ollama" cannot be opened because Apple cannot check it

1. Go to System Preferences → Security & Privacy
2. Click "Open Anyway" next to the Ollama message

### Windows: 'ollama' is not recognized

Ollama may not be in your PATH:
1. Find where Ollama is installed (usually `C:\Program Files\Ollama`)
2. Add it to your PATH environment variable
3. Restart your terminal

## Still Having Issues?

1. **Check Ollama logs:**
   ```bash
   # The location varies by platform
   # Linux/Mac: Usually in system logs or terminal output
   # Windows: Check Event Viewer or terminal output
   ```

2. **Verify your setup:**
   - Ollama version: `ollama --version`
   - Node version: `node --version` (should be v18+)
   - Check if ports are available: `netstat -an | grep 11434`

3. **Restart everything:**
   ```bash
   # Stop Ollama (Ctrl+C in terminal where it's running)
   # Stop React dev server (Ctrl+C)

   # Start Ollama with CORS
   OLLAMA_ORIGINS="http://localhost:5173" ollama serve

   # In another terminal, start React
   npm run dev
   ```

4. **Create an issue:**
   If none of the above works, please create an issue with:
   - Your operating system
   - Ollama version
   - Error messages from browser console
   - Error messages from terminal
