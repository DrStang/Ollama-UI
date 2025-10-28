# Ollama UI

A feature-rich, modern React-based web interface for interacting with your local Ollama server. Manage models and chat with AI models through an intuitive user interface.

![Ollama UI](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-6-purple)

## Features

### Model Management
- **List Models**: View all installed Ollama models with detailed information
- **Pull Models**: Download new models with real-time progress tracking
- **Delete Models**: Remove unwanted models with confirmation
- **Model Details**: View size, format, parameter count, and more

### Chat Interface
- **Multi-Model Support**: Chat with any installed Ollama model
- **Streaming Responses**: Real-time streaming of AI responses
- **Chat History**: Automatic saving of chat sessions to localStorage
- **Session Management**: Load, view, and delete previous chat sessions
- **Collapsible Sidebar**: Clean interface with toggleable chat history
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **Ollama** (running locally)
   - Download from [ollama.ai](https://ollama.ai/)
   - Verify installation: `ollama --version`
   - Start Ollama service: `ollama serve`

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Ollama-UI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Navigate to `http://localhost:5173`

## Usage

### Getting Started

1. **Ensure Ollama is running**
   ```bash
   ollama serve
   ```
   The Ollama server should be running on `http://localhost:11434`

2. **Pull your first model** (if you haven't already)
   - Go to the "Models" page
   - Enter a model name (e.g., `llama2`, `mistral`, `codellama`)
   - Click "Pull Model" and wait for the download to complete

3. **Start chatting**
   - Navigate to the "Chat" page
   - Select a model from the dropdown
   - Type your message and press Enter or click "Send"
   - Your chat history will be automatically saved

### Model Management

**Available models you can pull:**
- `llama2` - Meta's Llama 2 model
- `llama2:13b` - Larger Llama 2 variant
- `mistral` - Mistral AI's model
- `codellama` - Code-specialized Llama model
- `phi` - Microsoft's Phi model
- `neural-chat` - Intel's neural chat model
- Many more at [ollama.ai/library](https://ollama.ai/library)

**To pull a model:**
1. Go to the Models page
2. Enter the model name in the input field
3. Click "Pull Model"
4. Watch the progress bar for download status

**To delete a model:**
1. Find the model card in the Models page
2. Click the trash icon (🗑️)
3. Click again to confirm deletion

### Chat Interface

**Starting a new chat:**
1. Click "New Chat" button in the sidebar
2. Select your preferred model
3. Start typing your message

**Managing chat history:**
- All chats are automatically saved to your browser's localStorage
- Click on any previous chat in the sidebar to resume it
- Click the trash icon to delete a chat session
- Chat sessions show the model used and last updated date

**Tips:**
- Use Enter to send messages
- Use Shift+Enter to add new lines
- Responses stream in real-time
- First message of each chat becomes the chat title

## Configuration

### Changing Ollama Server URL

If your Ollama server is running on a different host or port, update the base URL in `src/services/ollama.ts`:

```typescript
const OLLAMA_BASE_URL = 'http://localhost:11434'; // Change this
```

### CORS Configuration

If you encounter CORS issues, you may need to configure Ollama to allow requests from your frontend:

```bash
# Set environment variable before starting Ollama
export OLLAMA_ORIGINS="http://localhost:5173"
ollama serve
```

## Building for Production

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Preview the production build**
   ```bash
   npm run preview
   ```

3. **Deploy the `dist` folder** to your web server

## Project Structure

```
Ollama-UI/
├── src/
│   ├── components/       # Reusable UI components
│   │   └── Navigation.tsx
│   ├── pages/           # Page components
│   │   ├── Models.tsx   # Model management page
│   │   └── Chat.tsx     # Chat interface page
│   ├── services/        # API services
│   │   └── ollama.ts    # Ollama API client
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/           # Utility functions
│   │   └── storage.ts   # localStorage helpers
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Application entry point
├── package.json
└── vite.config.ts
```

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Ollama API** - AI model interaction

## Troubleshooting

### Ollama Connection Issues

**Error: Failed to fetch models**
- Ensure Ollama is running: `ollama serve`
- Check if Ollama is accessible: `curl http://localhost:11434/api/tags`
- Verify CORS settings if needed

### Models Not Loading

- Restart the Ollama service
- Clear browser cache and reload
- Check Ollama logs for errors

### Chat Not Responding

- Verify the selected model is properly installed
- Check browser console for error messages
- Ensure Ollama has enough system resources

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Support

For issues and questions:
- Ollama documentation: [ollama.ai/docs](https://ollama.ai/docs)
- Create an issue in this repository

## Acknowledgments

- Built with [React](https://react.dev/)
- Powered by [Ollama](https://ollama.ai/)
- Styled with custom CSS
