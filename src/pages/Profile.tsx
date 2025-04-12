import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCosmosDB } from '../lib/cosmosdb';

interface Match {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  winner_id: string;
  played_at: string;
}

interface Player {
  id: string;
  username: string;
  displayName?: string;
}

function Profile() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const cosmosDB = await getCosmosDB();
        const matchesContainer = cosmosDB.containers.matches;
        const profilesContainer = cosmosDB.containers.profiles;
        
        // Fetch all player profiles to use for match display
        const { resources: playerProfiles } = await profilesContainer.items
          .query("SELECT c.id, c.username, c.displayName FROM c")
          .fetchAll();
        
        // Convert player profiles to a lookup map
        const playerMap: Record<string, Player> = {};
        for (const player of playerProfiles) {
          playerMap[player.id] = player;
        }
        setPlayers(playerMap);

        // Fetch matches created by current user
        const { resources: userMatches } = await matchesContainer.items
          .query({
            query: "SELECT * FROM c WHERE c.created_by = @userId ORDER BY c.played_at DESC",
            parameters: [{ name: "@userId", value: user.id }]
          })
          .fetchAll();

        setMatches(userMatches);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600 mb-4">You need to be logged in to view your profile.</p>
          <a href="/login" className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <User className="h-12 w-12 text-blue-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
        <p className="text-gray-600 mt-2">Welcome, {user.displayName || user.username}!</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="space-y-3">
          <div className="flex border-b pb-3">
            <span className="font-medium w-1/3">Username:</span>
            <span>{user.username}</span>
          </div>
          {user.displayName && (
            <div className="flex border-b pb-3">
              <span className="font-medium w-1/3">Display Name:</span>
              <span>{user.displayName}</span>
            </div>
          )}
          <div className="flex border-b pb-3">
            <span className="font-medium w-1/3">Email:</span>
            <span>{user.email || 'Not provided'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Your Recorded Matches</h2>
        
        {matches.length === 0 ? (
          <p className="text-gray-500 text-center py-4">You have not recorded any matches yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player 1</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Player 2</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Winner</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matches.map((match) => {
                  const player1 = players[match.player1_id];
                  const player2 = players[match.player2_id];
                  const winner = players[match.winner_id];
                  
                  return (
                    <tr key={match.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(match.played_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {player1 ? (player1.displayName || player1.username) : 'Unknown Player'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {player2 ? (player2.displayName || player2.username) : 'Unknown Player'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {match.player1_score} - {match.player2_score}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                        {winner ? (winner.displayName || winner.username) : 'Unknown Player'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;