import { Link, useNavigate } from 'react-router-dom';
import { Table as TableTennis, Trophy, LogIn, LogOut, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <TableTennis className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl">PingPong Pro</span>
          </Link>

          <div className="flex items-center space-x-4">
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
        </div>
      </div>
    </nav>
  );
}