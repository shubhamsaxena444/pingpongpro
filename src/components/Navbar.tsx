import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Table as TableTennis, Trophy, LogIn, LogOut, UserPlus, PlusCircle, Menu, X, List } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
      // Close mobile menu if open
      setMobileMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
            <TableTennis className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl">PingPong Pro</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/leaderboard"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600"
            >
              <Trophy className="h-5 w-5" />
              <span>Leaderboard</span>
            </Link>

            {user ? (
              <>
                <Link
                  to="/new-match"
                  className="flex items-center space-x-1 text-gray-700 hover:text-orange-600"
                >
                  <PlusCircle className="h-5 w-5" />
                  <span>Record Match</span>
                </Link>
                <Link
                  to="/all-matches"
                  className="flex items-center space-x-1 text-gray-700 hover:text-purple-600"
                >
                  <List className="h-5 w-5" />
                  <span>All Matches</span>
                </Link>
                <Link
                  to="/add-player"
                  className="flex items-center space-x-1 text-gray-700 hover:text-green-600"
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Add Player</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1 text-gray-700 hover:text-blue-600"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-1 text-gray-700 hover:text-blue-600"
              >
                <LogIn className="h-5 w-5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={toggleMobileMenu} 
              className="text-gray-700 focus:outline-none"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? 
                <X className="h-6 w-6" /> : 
                <Menu className="h-6 w-6" />
              }
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 pb-4 border-t border-gray-200 animate-fade-in-down">
            <Link
              to="/leaderboard"
              className="block py-2 text-gray-700 hover:text-blue-600"
              onClick={closeMobileMenu}
            >
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5" />
                <span>Leaderboard</span>
              </div>
            </Link>

            {user ? (
              <>
                <Link
                  to="/new-match"
                  className="block py-2 text-gray-700 hover:text-orange-600"
                  onClick={closeMobileMenu}
                >
                  <div className="flex items-center space-x-2">
                    <PlusCircle className="h-5 w-5" />
                    <span>Record Match</span>
                  </div>
                </Link>
                <Link
                  to="/all-matches"
                  className="block py-2 text-gray-700 hover:text-purple-600"
                  onClick={closeMobileMenu}
                >
                  <div className="flex items-center space-x-2">
                    <List className="h-5 w-5" />
                    <span>All Matches</span>
                  </div>
                </Link>
                <Link
                  to="/add-player"
                  className="block py-2 text-gray-700 hover:text-green-600"
                  onClick={closeMobileMenu}
                >
                  <div className="flex items-center space-x-2">
                    <UserPlus className="h-5 w-5" />
                    <span>Add Player</span>
                  </div>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left py-2 text-gray-700 hover:text-blue-600"
                >
                  <div className="flex items-center space-x-2">
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </div>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="block py-2 text-gray-700 hover:text-blue-600"
                onClick={closeMobileMenu}
              >
                <div className="flex items-center space-x-2">
                  <LogIn className="h-5 w-5" />
                  <span>Sign In</span>
                </div>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}