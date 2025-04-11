import { Link } from 'react-router-dom';
import { Table as TableTennis, Trophy, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Home() {
  const { user } = useAuth();
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Ping Pong Tracker
        </h1>
        <p className="text-lg text-gray-600">
          Track your matches, compete with friends, and climb the leaderboard!
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="flex justify-center mb-4">
            <TableTennis className="w-12 h-12 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Record Matches</h2>
          <p className="text-gray-600 mb-4">
            Keep track of your games and maintain your match history
          </p>
          <Link
            to="/new-match"
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            New Match
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="w-12 h-12 text-yellow-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Leaderboard</h2>
          <p className="text-gray-600 mb-4">
            See how you rank against other players
          </p>
          <Link
            to="/leaderboard"
            className="inline-block bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition"
          >
            View Rankings
          </Link>
        </div>
        
        {user && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex justify-center mb-4">
              <UserPlus className="w-12 h-12 text-purple-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Add Player</h2>
            <p className="text-gray-600 mb-4">
              Add new players to the competition
            </p>
            <Link
              to="/add-player"
              className="inline-block bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition"
            >
              Add Player
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;