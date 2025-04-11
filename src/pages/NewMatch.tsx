import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Table as TableTennis } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Player {
  id: string;
  username: string;
}

function NewMatch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPlayer1, setSelectedPlayer1] = useState<string>('');
  const [selectedPlayer2, setSelectedPlayer2] = useState<string>('');
  const [player1Score, setPlayer1Score] = useState<number>(0);
  const [player2Score, setPlayer2Score] = useState<number>(0);

  useEffect(() => {
    async function fetchPlayers() {
      try {
        console.log('Fetching players...');
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username')
          .order('username');

        if (error) {
          console.error('Supabase error fetching players:', error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          console.log('No players found in the database');
          setError('No players found. Please make sure users have registered.');
        } else {
          console.log(`Found ${data.length} players:`, data);
          setPlayers(data);
          
          // Auto-select the current user as player 1 if logged in
          if (user && data.length > 0) {
            const currentUserProfile = data.find(player => player.id === user.id);
            if (currentUserProfile) {
              console.log('Setting current user as player 1:', currentUserProfile.id);
              setSelectedPlayer1(currentUserProfile.id);
            } else {
              console.log('Current user profile not found among players');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching players:', err);
        setError('Failed to load players');
      } finally {
        setLoading(false);
      }
    }

    fetchPlayers();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedPlayer1 === selectedPlayer2) {
      setError('Please select different players');
      return;
    }

    if (player1Score === player2Score) {
      setError('Match cannot end in a tie');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const winnerId = player1Score > player2Score ? selectedPlayer1 : selectedPlayer2;

      // Insert match record
      const { error: matchError } = await supabase
        .from('matches')
        .insert([{
          player1_id: selectedPlayer1,
          player2_id: selectedPlayer2,
          player1_score: player1Score,
          player2_score: player2Score,
          winner_id: winnerId
        }]);

      if (matchError) throw matchError;

      // Update player statistics
      const { error: statsError } = await supabase.rpc('update_player_stats', {
        p1_id: selectedPlayer1,
        p2_id: selectedPlayer2,
        winner: winnerId
      });

      if (statsError) throw statsError;

      navigate('/leaderboard');
    } catch (err) {
      console.error('Error saving match:', err);
      setError('Failed to save match');
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
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <TableTennis className="h-12 w-12 text-blue-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Record New Match</h1>
        <p className="text-gray-600 mt-2">Enter the match details below</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        {players.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
            <p className="mb-2 font-semibold">No players available for selection!</p>
            <p className="text-sm">This may happen if:</p>
            <ul className="text-sm list-disc pl-5 mt-1">
              <li>Players have not completed registration</li>
              <li>User profiles weren't created properly</li>
              <li>There's an issue with the database connection</li>
            </ul>
            <button 
              type="button" 
              className="mt-3 text-sm bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700"
              onClick={async () => {
                try {
                  setError(null);
                  console.log("Manual refresh: fetching profiles directly...");
                  const { data, error } = await supabase
                    .from('profiles')
                    .select('*');
                  
                  if (error) {
                    console.error("Manual refresh error:", error);
                    setError(`Database error: ${error.message}`);
                  } else {
                    console.log("All profiles in database:", data);
                    if (data && data.length > 0) {
                      setPlayers(data.map(p => ({ id: p.id, username: p.username })));
                      setError(null);
                    } else {
                      setError("No profiles found in the database. Try registering new users.");
                    }
                  }
                } catch (err) {
                  console.error("Manual refresh exception:", err);
                  setError("Failed to check profiles");
                }
              }}
            >
              Refresh Players
            </button>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player 1
            </label>
            <select
              value={selectedPlayer1}
              onChange={(e) => setSelectedPlayer1(e.target.value)}
              className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Player</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.username}
                </option>
              ))}
            </select>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score
              </label>
              <input
                type="number"
                min="0"
                value={player1Score}
                onChange={(e) => setPlayer1Score(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player 2
            </label>
            <select
              value={selectedPlayer2}
              onChange={(e) => setSelectedPlayer2(e.target.value)}
              className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select Player</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.username}
                </option>
              ))}
            </select>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Score
              </label>
              <input
                type="number"
                min="0"
                value={player2Score}
                onChange={(e) => setPlayer2Score(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Match'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewMatch;