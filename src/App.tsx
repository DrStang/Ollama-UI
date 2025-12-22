import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Models } from './pages/Models';
import { Chat } from './pages/Chat';
import { Documents } from './pages/Documents';
import { Playground } from './pages/Playground';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <Routes>
          <Route path="/" element={<Models />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
