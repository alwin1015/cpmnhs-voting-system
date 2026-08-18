import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useVoting } from '@/contexts/VotingContext';
import { Button } from '@/components/ui/button';
import schoolLogo from '@/assets/school-logo.png';
import { LogOut, User, Menu, X, Vote } from 'lucide-react';
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
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="container mx-auto flex h-12 md:h-14 items-center justify-between px-3 sm:px-4">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group">
          <img
            src={schoolLogo}
            alt="CPMNHS Logo"
            className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-full border border-slate-200 shadow-2xs group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black text-slate-900 leading-none tracking-tight">
              CPMNHS iVote
            </span>
            <span className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
              Online Voting System
            </span>
          </div>
        </Link>

        {/* Center Title for Admins on large screens */}
        {centerTitle && (
          <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              {centerTitle}
            </span>
          </div>
        )}

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-5">
          {!centerTitle && location.pathname !== '/vote' && (
            <>
              <Link to="/" className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
                Home
              </Link>
              <Link to="/candidates" className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
                Candidates
              </Link>
              {isLoggedIn && user?.role === 'admin' && (
                <Link to="/results" className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
                  Live Results
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-2 sm:gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100">
                <User className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-bold text-blue-800 max-w-[120px] truncate">
                  {user?.name}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout} 
                className="h-8 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
              >
                <LogOut className="h-3.5 w-3.5 mr-1" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/login')} 
                className="h-8 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Student Login
              </Button>
              <Button 
                size="sm" 
                onClick={() => navigate('/admin-login')}
                className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
              >
                Admin
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          aria-label="Toggle navigation menu"
          className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-lg px-4 py-3 animate-fade-in shadow-lg">
          <nav className="flex flex-col gap-2">
            {location.pathname !== '/vote' && (
              <>
                <Link 
                  to="/" 
                  className="text-sm font-semibold py-2 px-2.5 rounded-lg text-slate-700 hover:bg-slate-100" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                <Link 
                  to="/candidates" 
                  className="text-sm font-semibold py-2 px-2.5 rounded-lg text-slate-700 hover:bg-slate-100" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Candidates
                </Link>
              </>
            )}

            {isLoggedIn && user?.role === 'admin' && (
              <>
                <Link 
                  to="/results" 
                  className="text-sm font-semibold py-2 px-2.5 rounded-lg text-slate-700 hover:bg-slate-100" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Live Results
                </Link>
                <Link 
                  to="/admin" 
                  className="text-sm font-semibold py-2 px-2.5 rounded-lg text-slate-700 hover:bg-slate-100" 
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin Panel
                </Link>
              </>
            )}

            <div className="border-t border-slate-100 pt-3 mt-1">
              {isLoggedIn ? (
                <div className="space-y-2">
                  <div className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-800 text-xs font-bold flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    <span className="truncate">{user?.name}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50 text-xs font-semibold h-9 rounded-lg" 
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1.5" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-center text-slate-700 text-xs font-semibold h-9 rounded-lg" 
                    onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                  >
                    Student Login
                  </Button>
                  <Button 
                    onClick={() => { navigate('/admin-login'); setMobileMenuOpen(false); }}
                    className="w-full justify-center text-white bg-blue-600 hover:bg-blue-700 text-xs font-bold h-9 rounded-lg shadow-xs"
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
