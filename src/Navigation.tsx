import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
  const location = useLocation();
  
  return (
    <nav className="navigation">
      <Link 
        to="/" 
        className={location.pathname === '/' ? 'active' : ''}
      >
        Single Answer
      </Link>
      <Link 
        to="/batch" 
        className={location.pathname === '/batch' ? 'active' : ''}
      >
        Batch Process
      </Link>
    </nav>
  );
}
