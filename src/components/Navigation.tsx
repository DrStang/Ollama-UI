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
        </div>
      </div>
    </nav>
  );
}
