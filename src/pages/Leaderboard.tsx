import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { getCosmosDB, IMatch, IDoublesMatch } from '../lib/cosmosdb';
import { Link } from 'react-router-dom';

interface PlayerStats {
  id: string;
  username: string;
  displayName: string | null;
  // Singles stats
  matches_played: number;
  matches_won: number;
  matches_lost: number; // Added losses
  win_rate: number | string;
  points_scored: number;
  points_conceded: number;
  avg_points_per_match: number | string;
  point_differential: number;
  biggest_win: number;
  // Doubles stats
  doubles_matches_played: number;
  doubles_matches_won: number;
  doubles_matches_lost: number; // Added losses
  doubles_win_rate: number | string;
  doubles_points_scored: number;
  doubles_points_conceded: number;
  doubles_avg_points_per_match: number | string;
  doubles_point_differential: number;
}

// New interface for team statistics
interface TeamStats {
  teamId: string; // Composite ID of two players
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  win_rate: number | string;
  points_scored: number;
  points_conceded: number;
  point_differential: number;
  avg_points_per_match: number | string;
}

function Leaderboard() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'singles' | 'doubles'>('singles');
  const [statView, setStatView] = useState<'wins' | 'points'>('wins');
  const [doublesView, setDoublesView] = useState<'players' | 'teams'>('players');

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const cosmosDB = await getCosmosDB();
        const profilesContainer = cosmosDB.containers.profiles;
        const matchesContainer = cosmosDB.containers.matches;
        
        // Fetch profiles data
        const { resources: profilesData } = await profilesContainer.items
          .query("SELECT c.id, c.username, c.displayName FROM c")
          .fetchAll();

        // Fetch matches data
        const { resources: matchesData } = await matchesContainer.items
          .query("SELECT * FROM c")
          .fetchAll();
        
        console.log('Fetched matches:', matchesData);
        console.log('Fetched profiles:', profilesData);

        // Process player stats
        const enhancedPlayers = profilesData.map(player => {
          // Singles match stats
          let totalPointsScored = 0;
          let totalPointsConceded = 0;
          let biggestWin = 0;
          let matches_played = 0;
          let matches_won = 0;
          let matches_lost = 0;
          
          // Doubles match stats
          let doublesPointsScored = 0;
          let doublesPointsConceded = 0;
          let doubles_matches_played = 0;
          let doubles_matches_won = 0;
          let doubles_matches_lost = 0;
          
          // Find all singles matches where this player participated
          const playerSinglesMatches = matchesData
            .filter((match: any) => 
              match.match_type === 'singles' && 
              (match.player1_id === player.id || match.player2_id === player.id)
            );
          
          matches_played = playerSinglesMatches.length;
          
          playerSinglesMatches.forEach((match: IMatch) => {
            // Did this player win?
            const playerWon = match.winner_id === player.id;
            
            if (playerWon) {
              matches_won++;
            } else {
              matches_lost++;
            }
            
            if (match.player1_id === player.id) {
              totalPointsScored += match.player1_score;
              totalPointsConceded += match.player2_score;
              
              if (playerWon) {
                const scoreDiff = match.player1_score - match.player2_score;
                if (scoreDiff > biggestWin) biggestWin = scoreDiff;
              }
            } else {
              totalPointsScored += match.player2_score;
              totalPointsConceded += match.player1_score;
              
              if (playerWon) {
                const scoreDiff = match.player2_score - match.player1_score;
                if (scoreDiff > biggestWin) biggestWin = scoreDiff;
              }
            }
          });

          // Find all doubles matches where this player participated
          const playerDoublesMatches = matchesData
            .filter((match: any) => 
              match.match_type === 'doubles' && 
              (
                match.team1_player1_id === player.id || 
                match.team1_player2_id === player.id ||
                match.team2_player1_id === player.id ||
                match.team2_player2_id === player.id
              )
            );
          
          doubles_matches_played = playerDoublesMatches.length;
          
          playerDoublesMatches.forEach((match: IDoublesMatch) => {
            // Check if player is on team 1
            const onTeam1 = match.team1_player1_id === player.id || match.team1_player2_id === player.id;
            
            // Did this player's team win?
            const playerTeamWon = (onTeam1 && match.winner_team === 'team1') || 
                                 (!onTeam1 && match.winner_team === 'team2');
            
            if (playerTeamWon) {
              doubles_matches_won++;
            } else {
              doubles_matches_lost++;
            }
            
            if (onTeam1) {
              doublesPointsScored += match.team1_score;
              doublesPointsConceded += match.team2_score;
            } else {
              doublesPointsScored += match.team2_score;
              doublesPointsConceded += match.team1_score;
            }
          });

          // Calculate singles stats
          const avgPointsPerMatch = matches_played > 0 
            ? (totalPointsScored / matches_played).toFixed(1) 
            : '0.0';
          
          // Calculate doubles stats
          const doublesAvgPointsPerMatch = doubles_matches_played > 0 
            ? (doublesPointsScored / doubles_matches_played).toFixed(1) 
            : '0.0';
          
          return {
            ...player,
            // Singles stats
            matches_played,
            matches_won,
            matches_lost,
            win_rate: matches_played > 0
              ? ((matches_won / matches_played) * 100).toFixed(1)
              : '0.0',
            points_scored: totalPointsScored,
            points_conceded: totalPointsConceded,
            avg_points_per_match: avgPointsPerMatch,
            point_differential: totalPointsScored - totalPointsConceded,
            biggest_win: biggestWin,
            
            // Doubles stats
            doubles_matches_played,
            doubles_matches_won,
            doubles_matches_lost,
            doubles_win_rate: doubles_matches_played > 0
              ? ((doubles_matches_won / doubles_matches_played) * 100).toFixed(1)
              : '0.0',
            doubles_points_scored: doublesPointsScored,
            doubles_points_conceded: doublesPointsConceded,
            doubles_avg_points_per_match: doublesAvgPointsPerMatch,
            doubles_point_differential: doublesPointsScored - doublesPointsConceded
          };
        });

        // Process team statistics for doubles matches
        const doublesMatches = matchesData.filter((match: any) => match.match_type === 'doubles');
        const teamStatsMap = new Map<string, TeamStats>();
        
        // Create a lookup map for player names
        const playerLookup = new Map();
        profilesData.forEach((player: any) => {
          playerLookup.set(player.id, player.displayName || player.username);
        });
        
        // Process each doubles match
        doublesMatches.forEach((match: IDoublesMatch) => {
          // Process team 1
          const team1Key = [match.team1_player1_id, match.team1_player2_id].sort().join('-');
          const team1Won = match.winner_team === 'team1';
          
          if (!teamStatsMap.has(team1Key)) {
            teamStatsMap.set(team1Key, {
              teamId: team1Key,
              player1Id: match.team1_player1_id,
              player2Id: match.team1_player2_id,
              player1Name: playerLookup.get(match.team1_player1_id) || 'Unknown',
              player2Name: playerLookup.get(match.team1_player2_id) || 'Unknown',
              matches_played: 0,
              matches_won: 0,
              matches_lost: 0,
              win_rate: '0.0',
              points_scored: 0,
              points_conceded: 0,
              point_differential: 0,
              avg_points_per_match: '0.0'
            });
          }
          
          const team1Stats = teamStatsMap.get(team1Key)!;
          team1Stats.matches_played += 1;
          team1Stats.points_scored += match.team1_score;
          team1Stats.points_conceded += match.team2_score;
          
          if (team1Won) {
            team1Stats.matches_won += 1;
          } else {
            team1Stats.matches_lost += 1;
          }
          
          team1Stats.point_differential = team1Stats.points_scored - team1Stats.points_conceded;
          team1Stats.avg_points_per_match = (team1Stats.points_scored / team1Stats.matches_played).toFixed(1);
          team1Stats.win_rate = ((team1Stats.matches_won / team1Stats.matches_played) * 100).toFixed(1);
          
          // Process team 2
          const team2Key = [match.team2_player1_id, match.team2_player2_id].sort().join('-');
          const team2Won = match.winner_team === 'team2';
          
          if (!teamStatsMap.has(team2Key)) {
            teamStatsMap.set(team2Key, {
              teamId: team2Key,
              player1Id: match.team2_player1_id,
              player2Id: match.team2_player2_id,
              player1Name: playerLookup.get(match.team2_player1_id) || 'Unknown',
              player2Name: playerLookup.get(match.team2_player2_id) || 'Unknown',
              matches_played: 0,
              matches_won: 0,
              matches_lost: 0,
              win_rate: '0.0',
              points_scored: 0,
              points_conceded: 0,
              point_differential: 0,
              avg_points_per_match: '0.0'
            });
          }
          
          const team2Stats = teamStatsMap.get(team2Key)!;
          team2Stats.matches_played += 1;
          team2Stats.points_scored += match.team2_score;
          team2Stats.points_conceded += match.team1_score;
          
          if (team2Won) {
            team2Stats.matches_won += 1;
          } else {
            team2Stats.matches_lost += 1;
          }
          
          team2Stats.point_differential = team2Stats.points_scored - team2Stats.points_conceded;
          team2Stats.avg_points_per_match = (team2Stats.points_scored / team2Stats.matches_played).toFixed(1);
          team2Stats.win_rate = ((team2Stats.matches_won / team2Stats.matches_played) * 100).toFixed(1);
        });
        
        setPlayers(enhancedPlayers);
        setTeams(Array.from(teamStatsMap.values()));
      } catch (err) {
        console.error('Exception when loading leaderboard:', err);
        setError('Failed to load leaderboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  // Sort players based on active tab and stat view
  const sortedPlayers = [...players].sort((a, b) => {
    if (activeTab === 'singles') {
      if (statView === 'wins') {
        // First sort by win count, then by win rate if tied
        if (b.matches_won === a.matches_won) {
          return parseFloat(String(b.win_rate)) - parseFloat(String(a.win_rate));
        }
        return b.matches_won - a.matches_won;
      } else {
        return b.point_differential - a.point_differential;
      }
    } else { // doubles
      if (statView === 'wins') {
        // First sort by win count, then by win rate if tied
        if (b.doubles_matches_won === a.doubles_matches_won) {
          return parseFloat(String(b.doubles_win_rate)) - parseFloat(String(a.doubles_win_rate));
        }
        return b.doubles_matches_won - a.doubles_matches_won;
      } else {
        return b.doubles_point_differential - a.doubles_point_differential;
      }
    }
  });
  
  // Sort teams based on stat view
  const sortedTeams = [...teams].sort((a, b) => {
    if (statView === 'wins') {
      // First sort by win count, then by win rate if tied
      if (b.matches_won === a.matches_won) {
        return parseFloat(String(b.win_rate)) - parseFloat(String(a.win_rate));
      }
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
          <Trophy className="h-10 w-10 md:h-12 md:w-12 text-yellow-500" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Player Rankings</h1>
        <p className="text-sm md:text-base text-gray-600 mt-2">See how players stack up against each other!</p>
      </div>

      {error ? (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition mr-3"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Match Type Tabs */}
          <div className="border-b flex">
            <button 
              className={`py-2 px-3 md:py-3 md:px-6 font-medium text-xs md:text-sm ${activeTab === 'singles' ? 'bg-blue-50 border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('singles')}
            >
              Singles Matches
            </button>
            <button 
              className={`py-2 px-3 md:py-3 md:px-6 font-medium text-xs md:text-sm ${activeTab === 'doubles' ? 'bg-blue-50 border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('doubles')}
            >
              Doubles Matches
            </button>
          </div>
          
          {/* Doubles View Type Tabs - Only shown when doubles is active */}
          {activeTab === 'doubles' && (
            <div className="border-b flex">
              <button 
                className={`py-2 px-3 md:py-3 md:px-6 font-medium text-xs md:text-sm ${doublesView === 'players' ? 'bg-green-50 border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setDoublesView('players')}
              >
                By Player
              </button>
              <button 
                className={`py-2 px-3 md:py-3 md:px-6 font-medium text-xs md:text-sm ${doublesView === 'teams' ? 'bg-green-50 border-b-2 border-green-500 text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setDoublesView('teams')}
              >
                By Team
              </button>
            </div>
          )}
          
          {/* Stats Type Tabs */}
          <div className="border-b flex">
            <button 
              className={`py-2 px-3 md:py-3 md:px-6 font-medium text-xs md:text-sm ${statView === 'wins' ? 'bg-gray-50 border-b-2 border-gray-500 text-gray-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setStatView('wins')}
            >
              Wins & Matches
            </button>
            <button 
              className={`py-2 px-3 md:py-3 md:px-6 font-medium text-xs md:text-sm ${statView === 'points' ? 'bg-gray-50 border-b-2 border-gray-500 text-gray-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setStatView('points')}
            >
              Points & Scoring
            </button>
          </div>

          {/* Mobile view */}
          <div className="block md:hidden">
            {activeTab === 'singles' ? (
              // Singles Mobile View
              <div className="divide-y divide-gray-200">
                {statView === 'wins' ? (
                  // Singles Wins Mobile View
                  sortedPlayers.map((player, index) => (
                    <div key={player.id} className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">#{index + 1} {player.username}</div>
                        <div className="text-sm text-blue-600">{player.win_rate}% win rate</div>
                      </div>
                      <div className="grid grid-cols-3 text-sm text-gray-500">
                        <div>Matches: {player.matches_played}</div>
                        <div>Wins: {player.matches_won}</div>
                        <div>Losses: {player.matches_lost}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  // Singles Points Mobile View
                  sortedPlayers.map((player, index) => (
                    <div key={player.id} className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">#{index + 1} {player.username}</div>
                        <div className="text-sm" style={{ color: player.point_differential > 0 ? 'green' : player.point_differential < 0 ? 'red' : 'inherit' }}>
                          {player.point_differential > 0 ? '+' : ''}{player.point_differential} pts
                        </div>
                      </div>
                      <div className="grid grid-cols-2 text-sm text-gray-500">
                        <div>Points: {player.points_scored}</div>
                        <div>Avg: {player.avg_points_per_match}/game</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : doublesView === 'players' ? (
              // Doubles Players Mobile View
              <div className="divide-y divide-gray-200">
                {statView === 'wins' ? (
                  // Doubles Wins Mobile View
                  sortedPlayers.map((player, index) => (
                    <div key={player.id} className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">#{index + 1} {player.username}</div>
                        <div className="text-sm text-blue-600">{player.doubles_win_rate}% win rate</div>
                      </div>
                      <div className="grid grid-cols-3 text-sm text-gray-500">
                        <div>Matches: {player.doubles_matches_played}</div>
                        <div>Wins: {player.doubles_matches_won}</div>
                        <div>Losses: {player.doubles_matches_lost}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  // Doubles Points Mobile View
                  sortedPlayers.map((player, index) => (
                    <div key={player.id} className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">#{index + 1} {player.username}</div>
                        <div className="text-sm" style={{ color: player.doubles_point_differential > 0 ? 'green' : player.doubles_point_differential < 0 ? 'red' : 'inherit' }}>
                          {player.doubles_point_differential > 0 ? '+' : ''}{player.doubles_point_differential} pts
                        </div>
                      </div>
                      <div className="grid grid-cols-2 text-sm text-gray-500">
                        <div>Points: {player.doubles_points_scored}</div>
                        <div>Avg: {player.doubles_avg_points_per_match}/game</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Doubles Teams Mobile View
              <div className="divide-y divide-gray-200">
                {statView === 'wins' ? (
                  // Teams Wins Mobile View
                  sortedTeams.map((team, index) => (
                    <div key={team.teamId} className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">#{index + 1} Team</div>
                        <div className="text-sm text-blue-600">{team.win_rate}% win rate</div>
                      </div>
                      <div className="text-sm text-gray-900 mb-1">
                        {team.player1Name} & {team.player2Name}
                      </div>
                      <div className="grid grid-cols-3 text-sm text-gray-500">
                        <div>Matches: {team.matches_played}</div>
                        <div>Wins: {team.matches_won}</div>
                        <div>Losses: {team.matches_lost}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  // Teams Points Mobile View
                  sortedTeams.map((team, index) => (
                    <div key={team.teamId} className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">#{index + 1} Team</div>
                        <div className="text-sm" style={{ color: team.point_differential > 0 ? 'green' : team.point_differential < 0 ? 'red' : 'inherit' }}>
                          {team.point_differential > 0 ? '+' : ''}{team.point_differential} pts
                        </div>
                      </div>
                      <div className="text-sm text-gray-900 mb-1">
                        {team.player1Name} & {team.player2Name}
                      </div>
                      <div className="grid grid-cols-2 text-sm text-gray-500">
                        <div>Points: {team.points_scored}</div>
                        <div>Avg: {team.avg_points_per_match}/game</div>
                      </div>
                    </div>
                  ))
                )}
                {sortedTeams.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    No doubles matches recorded yet. Start playing doubles to see team statistics!
                  </div>
                )}
              </div>
            )}
            
            {/* Empty state message for mobile */}
            {players.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No players found. Start playing matches to appear on the leaderboard!
              </div>
            )}
          </div>

          {/* Desktop view - Tables */}
          <div className="hidden md:block">
            {activeTab === 'singles' ? (
              // Singles Desktop View
              statView === 'wins' ? (
                // Singles Wins Desktop View
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
                        Losses
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
                          {player.displayName && (
                            <div className="text-sm text-gray-500">{player.displayName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.matches_played}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.matches_won}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.matches_lost}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.win_rate}%</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                // Singles Points Desktop View
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
                        Conceded
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
                          {player.displayName && (
                            <div className="text-sm text-gray-500">{player.displayName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.points_scored}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.points_conceded}</div>
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
                  </tbody>
                </table>
              )
            ) : doublesView === 'players' ? (
              // Doubles Players Desktop View
              statView === 'wins' ? (
                // Doubles Wins Desktop View
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
                        Doubles Matches
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Doubles Wins
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Doubles Losses
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
                          {player.displayName && (
                            <div className="text-sm text-gray-500">{player.displayName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.doubles_matches_played}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.doubles_matches_won}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.doubles_matches_lost}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.doubles_win_rate}%</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                // Doubles Points Desktop View
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
                        Conceded
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Per Match
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Differential
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
                          {player.displayName && (
                            <div className="text-sm text-gray-500">{player.displayName}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.doubles_points_scored}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.doubles_points_conceded}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{player.doubles_avg_points_per_match}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900" style={{ color: player.doubles_point_differential > 0 ? 'green' : player.doubles_point_differential < 0 ? 'red' : 'inherit' }}>
                            {player.doubles_point_differential > 0 ? '+' : ''}{player.doubles_point_differential}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              // Teams Desktop View
              statView === 'wins' ? (
                // Teams Wins Desktop View
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Matches
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Wins
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Losses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Win Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedTeams.map((team, index) => (
                      <tr key={team.teamId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">#{index + 1}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{team.player1Name} & {team.player2Name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{team.matches_played}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{team.matches_won}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{team.matches_lost}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{team.win_rate}%</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                // Teams Points Desktop View
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points Scored
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conceded
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Per Match
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Differential
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedTeams.map((team, index) => (
                      <tr key={team.teamId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">#{index + 1}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{team.player1Name} & {team.player2Name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{team.points_scored}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{team.points_conceded}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{team.avg_points_per_match}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900" style={{ color: team.point_differential > 0 ? 'green' : team.point_differential < 0 ? 'red' : 'inherit' }}>
                            {team.point_differential > 0 ? '+' : ''}{team.point_differential}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
            
            {/* Empty state messages for desktop */}
            {players.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No players found. Start playing matches to appear on the leaderboard!
              </div>
            )}
            
            {players.length > 0 && activeTab === 'doubles' && doublesView === 'players' && 
             !players.some(p => p.doubles_matches_played > 0) && (
              <div className="p-6 text-center text-gray-500">
                No doubles matches recorded yet. Start playing doubles to appear on this leaderboard!
              </div>
            )}
            
            {activeTab === 'doubles' && doublesView === 'teams' && teams.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No doubles matches recorded yet. Start playing doubles to see team statistics!
              </div>
            )}
          </div>
        </div>
      )}

      {!error && players.length === 0 && (
        <div className="mt-6 text-center">
          <p className="text-gray-600 mb-4">Ready to join the competition?</p>
          <Link 
            to="/login" 
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            Sign in to add players and record matches
          </Link>
        </div>
      )}
    </div>
  );
}

export default Leaderboard;