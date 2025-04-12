import { Link } from 'react-router-dom';
import { Trophy, UserPlus, PenSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Home() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-3 text-gray-900">Ping Pong Tracker</h1>
        <p className="text-xl text-gray-600">
          Track matches, players, and rankings for your office ping pong tournaments
        </p>
      </div>

      {!user ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-semibold mb-6">Get Started</h2>
          <p className="mb-6 text-gray-600">
            Sign in with your Microsoft account to start tracking ping pong matches
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/login"
              className="inline-block bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="inline-block bg-gray-200 text-gray-800 py-3 px-6 rounded-md hover:bg-gray-300 transition"
            >
              Create Account
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <Link
            to="/leaderboard"
            className="bg-white p-8 rounded-lg shadow-md text-center hover:shadow-lg transition"
          >
            <Trophy className="mx-auto h-14 w-14 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Leaderboard</h2>
            <p className="text-gray-600">
              View player rankings and match statistics
            </p>
          </Link>

          <Link
            to="/add-player"
            className="bg-white p-8 rounded-lg shadow-md text-center hover:shadow-lg transition"
          >
            <UserPlus className="mx-auto h-14 w-14 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Add Player</h2>
            <p className="text-gray-600">
              Register a new player for your matches
            </p>
          </Link>

          <Link
            to="/new-match"
            className="bg-white p-8 rounded-lg shadow-md text-center hover:shadow-lg transition"
          >
            <PenSquare className="mx-auto h-14 w-14 text-blue-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Record Match</h2>
            <p className="text-gray-600">
              Log a completed match with results
            </p>
          </Link>
        </div>
      )}

      <div className="mt-12 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">About Ping Pong Tracker</h2>
        <p className="text-gray-600 mb-4">
          This application helps you manage your ping pong tournaments by tracking players, 
          matches, and maintaining an up-to-date leaderboard.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border border-gray-200 p-4 rounded-md">
            <h3 className="font-medium text-lg mb-2">Player Profiles</h3>
            <p className="text-gray-600">Create and manage player profiles with stats and history.</p>
          </div>
          <div className="border border-gray-200 p-4 rounded-md">
            <h3 className="font-medium text-lg mb-2">Match Recording</h3>
            <p className="text-gray-600">Log match results and keep track of scores and winners.</p>
          </div>
          <div className="border border-gray-200 p-4 rounded-md">
            <h3 className="font-medium text-lg mb-2">Statistics</h3>
            <p className="text-gray-600">View detailed player statistics and performance metrics.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;