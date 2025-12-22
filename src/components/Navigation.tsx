import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

export function Navigation() {
  const location = useLocation();

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <span className="nav-logo">🦙</span>
          <span className="nav-title">Ollama UI</span>
        </div>
        <div className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Models
          </Link>
          <Link
            to="/chat"
            className={`nav-link ${location.pathname === '/chat' ? 'active' : ''}`}
          >
            Chat
          </Link>
          <Link
            to="/playground"
            className={`nav-link ${location.pathname === '/playground' ? 'active' : ''}`}
          >
            Playground
          </Link>
          <Link
            to="/documents"
            className={`nav-link ${location.pathname === '/documents' ? 'active' : ''}`}
          >
            Documents
          </Link>
        </div>
      </div>
    </nav>
  );
}
