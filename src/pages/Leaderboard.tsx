import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

interface PlayerStats {
  id: string;
  username: string;
  full_name: string | null;
  matches_played: number;
  matches_won: number;
  win_rate: number | string;
  points_scored: number;
  points_conceded: number;
  avg_points_per_match: number | string;
  point_differential: number;
  biggest_win: number;
}

function Leaderboard() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'wins' | 'points'>('wins');

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        // Fetch profiles data
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name, matches_played, matches_won');

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          
          if (profilesError.code === 'PGRST301') {
            setError('Please sign in to view the leaderboard');
          } else {
            setError('Failed to load leaderboard. Please try again later.');
          }
          return;
        }

        // Fetch matches data
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*');

        if (matchesError) {
          console.error('Error fetching matches:', matchesError);
          setError('Failed to load match statistics. Please try again later.');
          return;
        }

        // Process and combine the data
        const enhancedPlayers = profilesData.map(player => {
          // Calculate points statistics
          let totalPointsScored = 0;
          let totalPointsConceded = 0;
          let biggestWin = 0;
          
          // Find all matches where this player participated
          const playerMatches = matchesData.filter(match => 
            match.player1_id === player.id || match.player2_id === player.id
          );
          
          playerMatches.forEach(match => {
            if (match.player1_id === player.id) {
              totalPointsScored += match.player1_score;
              totalPointsConceded += match.player2_score;
              
              const scoreDiff = match.player1_score - match.player2_score;
              if (scoreDiff > biggestWin) biggestWin = scoreDiff;
            } else {
              totalPointsScored += match.player2_score;
              totalPointsConceded += match.player1_score;
              
              const scoreDiff = match.player2_score - match.player1_score;
              if (scoreDiff > biggestWin) biggestWin = scoreDiff;
            }
          });

          const avgPointsPerMatch = player.matches_played > 0 
            ? (totalPointsScored / player.matches_played).toFixed(1) 
            : '0.0';
          
          return {
            ...player,
            win_rate: player.matches_played > 0
              ? ((player.matches_won / player.matches_played) * 100).toFixed(1)
              : '0.0',
            points_scored: totalPointsScored,
            points_conceded: totalPointsConceded,
            avg_points_per_match: avgPointsPerMatch,
            point_differential: totalPointsScored - totalPointsConceded,
            biggest_win: biggestWin
          };
        });

        setPlayers(enhancedPlayers);
      } catch (err) {
        console.error('Exception when loading leaderboard:', err);
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  // Sort players based on active tab
  const sortedPlayers = [...players].sort((a, b) => {
    if (activeTab === 'wins') {
      return b.matches_won - a.matches_won;
    } else {
      return b.point_differential - a.point_differential;
    }
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Trophy className="h-12 w-12 text-yellow-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Player Rankings</h1>
        <p className="text-gray-600 mt-2">See how players stack up against each other!</p>
      </div>

      {error ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/login" className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
            Sign In
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="border-b flex">
            <button 
              className={`py-3 px-6 font-medium text-sm ${activeTab === 'wins' ? 'bg-blue-50 border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('wins')}
            >
              Wins & Matches
            </button>
            <button 
              className={`py-3 px-6 font-medium text-sm ${activeTab === 'points' ? 'bg-blue-50 border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('points')}
            >
              Points & Scoring
            </button>
          </div>

          {activeTab === 'wins' ? (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wins
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Win Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPlayers.map((player, index) => (
                  <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{index + 1}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{player.username}</div>
                      {player.full_name && (
                        <div className="text-sm text-gray-500">{player.full_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{player.matches_played}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{player.matches_won}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{player.win_rate}%</div>
                    </td>
                  </tr>
                ))}
                {players.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No players found. Start playing matches to appear on the leaderboard!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Points Scored
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Per Match
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Differential
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Biggest Win
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPlayers.map((player, index) => (
                  <tr key={player.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{index + 1}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{player.username}</div>
                      {player.full_name && (
                        <div className="text-sm text-gray-500">{player.full_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{player.points_scored}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{player.avg_points_per_match}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900" style={{ color: player.point_differential > 0 ? 'green' : player.point_differential < 0 ? 'red' : 'inherit' }}>
                        {player.point_differential > 0 ? '+' : ''}{player.point_differential}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{player.biggest_win}</div>
                    </td>
                  </tr>
                ))}
                {players.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No players found. Start playing matches to appear on the leaderboard!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default Leaderboard;