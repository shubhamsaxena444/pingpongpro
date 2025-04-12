import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCosmosDB } from '../lib/cosmosdb';
import { useAuth } from '../contexts/AuthContext';

interface Player {
  id: string;
  username: string;
  displayName?: string;
}

function NewMatch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [player1, setPlayer1] = useState<string>('');
  const [player2, setPlayer2] = useState<string>('');
  const [player1Score, setPlayer1Score] = useState<number>(0);
  const [player2Score, setPlayer2Score] = useState<number>(0);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const cosmosDB = await getCosmosDB();
        const profilesContainer = cosmosDB.containers.profiles;
        
        // Fetch all player profiles
        const { resources: playerProfiles } = await profilesContainer.items
          .query("SELECT c.id, c.username, c.displayName FROM c")
          .fetchAll();
        
        setPlayers(playerProfiles);
      } catch (err) {
        console.error('Error fetching players:', err);
        setError('Failed to load players. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (player1 === player2) {
      setError('Please select different players for the match.');
      return;
    }

    if (player1Score === player2Score) {
      setError('The match cannot end in a tie. One player must win.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const cosmosDB = await getCosmosDB();
      const matchesContainer = cosmosDB.containers.matches;
      const profilesContainer = cosmosDB.containers.profiles;
      
      // Determine the winner and loser
      const winnerId = player1Score > player2Score ? player1 : player2;
      const loserId = player1Score > player2Score ? player2 : player1;
      
      // Create match record
      const matchId = crypto.randomUUID();
      const matchData = {
        id: matchId,
        player1_id: player1,
        player2_id: player2,
        player1_score: player1Score,
        player2_score: player2Score,
        winner_id: winnerId,
        created_by: user?.id || null,
        played_at: new Date().toISOString()
      };
      
      // Add match to Cosmos DB
      await matchesContainer.items.create(matchData);
      
      // Update player statistics (matches_played and matches_won)
      // For winner
      const { resource: winnerProfile } = await profilesContainer.item(winnerId, winnerId).read();
      if (winnerProfile) {
        await profilesContainer.item(winnerId, winnerId).replace({
          ...winnerProfile,
          matches_played: (winnerProfile.matches_played || 0) + 1,
          matches_won: (winnerProfile.matches_won || 0) + 1,
          updated_at: new Date().toISOString()
        });
      }
      
      // For loser
      const { resource: loserProfile } = await profilesContainer.item(loserId, loserId).read();
      if (loserProfile) {
        await profilesContainer.item(loserId, loserId).replace({
          ...loserProfile,
          matches_played: (loserProfile.matches_played || 0) + 1,
          updated_at: new Date().toISOString()
        });
      }
      
      // Navigate to the leaderboard page
      navigate('/leaderboard');
      
    } catch (err: any) {
      console.error('Error submitting match:', err);
      setError(err.message || 'Failed to submit match');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold text-center mb-8">Record New Match</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player 1
            </label>
            <select
              value={player1}
              onChange={(e) => setPlayer1(e.target.value)}
              className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select player</option>
              {players.map(player => (
                <option key={player.id} value={player.id}>
                  {player.displayName || player.username}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player 2
            </label>
            <select
              value={player2}
              onChange={(e) => setPlayer2(e.target.value)}
              className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select player</option>
              {players.map(player => (
                <option key={player.id} value={player.id}>
                  {player.displayName || player.username}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player 1 Score
            </label>
            <input
              type="number"
              min="0"
              max="999"
              value={player1Score}
              onChange={(e) => setPlayer1Score(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player 2 Score
            </label>
            <input
              type="number"
              min="0"
              max="999"
              value={player2Score}
              onChange={(e) => setPlayer2Score(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="mt-6">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Match'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewMatch;