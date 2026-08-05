import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useVoting } from '@/contexts/VotingContext';
import { Button } from '@/components/ui/button';
import schoolLogo from '@/assets/school-logo.png';
import { LogOut, User, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { user, isLoggedIn, logout } = useVoting();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Determine center title based on route
  const getCenterTitle = () => {
    if (location.pathname.startsWith('/admin')) return 'Admin Dashboard';
    if (isLoggedIn && user?.role === 'admin') return 'Admin Dashboard';
    return null;
  };

  const centerTitle = getCenterTitle();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="container mx-auto flex h-12 md:h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-gray-900 leading-tight">CPMNHS</h1>
            <p className="text-xs text-gray-500">Voting Site</p>
          </div>
        </Link>

        {/* Center Title */}
        {centerTitle && (
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
            <span className="text-sm font-medium text-gray-500">{centerTitle}</span>
          </div>
        )}

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {!centerTitle && (
            <>
              <Link to="/" className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
                Home
              </Link>
              <Link to="/candidates" className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
                Candidates
              </Link>
              {isLoggedIn && user?.role === 'admin' && (
                <Link to="/results" className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
                  Results
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {user?.name}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-gray-700">
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          ) : (
                          <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="text-gray-500 hover:bg-transparent hover:text-gray-700 active:bg-transparent focus:bg-transparent">
                Student Login
              </Button>
              <Button 
                size="sm" 
                onClick={() => navigate('/admin-login')}
                className="text-white"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                Admin
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white animate-fade-in">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
            <Link to="/" className="text-sm font-medium py-2 text-gray-700" onClick={() => setMobileMenuOpen(false)}>
              Home
            </Link>
            <Link to="/candidates" className="text-sm font-medium py-2 text-gray-700" onClick={() => setMobileMenuOpen(false)}>
              Candidates
            </Link>
            {isLoggedIn && user?.role === 'admin' && (
              <Link to="/results" className="text-sm font-medium py-2 text-gray-700" onClick={() => setMobileMenuOpen(false)}>
                Results
              </Link>
            )}
            {isLoggedIn && user?.role === 'admin' && (
              <Link to="/admin" className="text-sm font-medium py-2 text-gray-700" onClick={() => setMobileMenuOpen(false)}>
                Admin Panel
              </Link>
            )}
            <div className="border-t border-gray-100 pt-3 mt-2">
              {isLoggedIn ? (
                <Button variant="ghost" className="w-full justify-start text-gray-600" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button variant="outline" onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}>
                    Student Login
                  </Button>
                  <Button onClick={() => { navigate('/admin-login'); setMobileMenuOpen(false); }}
                    className="text-white"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                  >
                    Admin Login
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

