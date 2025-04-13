import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCosmosDB, IMatch, IDoublesMatch, isSinglesMatch, isDoublesMatch } from '../lib/cosmosdb';
import { useAuth } from '../contexts/AuthContext';

// Update the core interfaces to include match_summary
interface IMatchWithSummary extends IMatch {
  match_summary?: string;
}

interface IDoublesMatchWithSummary extends IDoublesMatch {
  match_summary?: string;
}

// Extended match type for display purposes
type ExtendedMatchType = IMatchWithSummary | IDoublesMatchWithSummary;

interface DisplayMatch {
  id: string;
  played_at: string;
  match_type: 'singles' | 'doubles';
  player1Name?: string;
  player2Name?: string;
  player1_score?: number;
  player2_score?: number;
  team1Player1Name?: string;
  team1Player2Name?: string;
  team2Player1Name?: string;
  team2Player2Name?: string;
  team1_score?: number;
  team2_score?: number;
  winnerName?: string;
  matchSummary?: string;
  winner_team?: 'team1' | 'team2'; // Added explicit winner_team field
  winner_id?: string;
  player1_id?: string;
  player2_id?: string;
  team1_player1_id?: string;
  team1_player2_id?: string;
  team2_player1_id?: string;
  team2_player2_id?: string;
}

// Interface for player data
interface Player {
  id: string;
  username: string;
  displayName?: string;
}

function AllMatches() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState<DisplayMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const cosmosDB = await getCosmosDB();
      
      // Fetch all players first to get their names
      const { resources: playerProfiles } = await cosmosDB.containers.profiles.items
        .query("SELECT c.id, c.username, c.displayName FROM c")
        .fetchAll();
      
      // Create a lookup map of player ID to player data
      const playerMap: Record<string, Player> = {};
      playerProfiles.forEach((player: Player) => {
        playerMap[player.id] = player;
      });
      
      // Fetch all matches
      const { resources: matchResources } = await cosmosDB.containers.matches.items
        .query("SELECT * FROM c ORDER BY c.played_at DESC")
        .fetchAll();
      
      // Process match data for display
      const processedMatches = matchResources.map((match: ExtendedMatchType) => {
        const displayMatch: DisplayMatch = { 
          id: match.id,
          played_at: match.played_at,
          match_type: match.match_type
        };
        
        // Add player names for easier display
        if (isSinglesMatch(match)) {
          displayMatch.player1_id = match.player1_id;
          displayMatch.player2_id = match.player2_id;
          displayMatch.player1Name = getPlayerName(playerMap, match.player1_id);
          displayMatch.player2Name = getPlayerName(playerMap, match.player2_id);
          displayMatch.winner_id = match.winner_id;
          displayMatch.winnerName = getPlayerName(playerMap, match.winner_id);
          displayMatch.player1_score = match.player1_score;
          displayMatch.player2_score = match.player2_score;
          displayMatch.matchSummary = (match as IMatchWithSummary).match_summary;
        } else if (isDoublesMatch(match)) {
          displayMatch.team1_player1_id = match.team1_player1_id;
          displayMatch.team1_player2_id = match.team1_player2_id;
          displayMatch.team2_player1_id = match.team2_player1_id;
          displayMatch.team2_player2_id = match.team2_player2_id;
          displayMatch.team1Player1Name = getPlayerName(playerMap, match.team1_player1_id);
          displayMatch.team1Player2Name = getPlayerName(playerMap, match.team1_player2_id);
          displayMatch.team2Player1Name = getPlayerName(playerMap, match.team2_player1_id);
          displayMatch.team2Player2Name = getPlayerName(playerMap, match.team2_player2_id);
          displayMatch.team1_score = match.team1_score;
          displayMatch.team2_score = match.team2_score;
          displayMatch.winner_team = match.winner_team; // Fixed: Changed winning_team to winner_team
          displayMatch.matchSummary = (match as IDoublesMatchWithSummary).match_summary;
        }
        
        return displayMatch;
      });
      
      setMatches(processedMatches);
    } catch (err: any) {
      console.error('Error fetching matches:', err);
      setError('Failed to load matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const getPlayerName = (playerMap: Record<string, Player>, playerId: string): string => {
    if (!playerId) return 'Unknown Player';
    const player = playerMap[playerId];
    return player ? (player.displayName || player.username) : `Unknown (${playerId.substring(0, 6)}...)`;
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (confirmDelete !== matchId) {
      setConfirmDelete(matchId);
      return;
    }
    
    try {
      setDeleteLoading(matchId);
      const cosmosDB = await getCosmosDB();
      
      // Find the match to be deleted
      const matchToDelete = matches.find(match => match.id === matchId);
      if (!matchToDelete) {
        throw new Error('Match not found');
      }
      
      // Delete the match from Cosmos DB
      await cosmosDB.containers.matches.item(matchId, matchId).delete();
      
      // Update players' statistics
      const profilesContainer = cosmosDB.containers.profiles;
      
      if (matchToDelete.match_type === 'singles' && matchToDelete.player1_id && matchToDelete.player2_id && matchToDelete.winner_id) {
        // Update player 1 stats
        const { resource: player1Profile } = await profilesContainer.item(matchToDelete.player1_id, matchToDelete.player1_id).read();
        if (player1Profile) {
          const isPlayer1Winner = matchToDelete.player1_id === matchToDelete.winner_id;
          await profilesContainer.item(matchToDelete.player1_id, matchToDelete.player1_id).replace({
            ...player1Profile,
            matches_played: Math.max(0, (player1Profile.matches_played || 0) - 1),
            matches_won: isPlayer1Winner ? Math.max(0, (player1Profile.matches_won || 0) - 1) : (player1Profile.matches_won || 0),
          });
        }
        
        // Update player 2 stats
        const { resource: player2Profile } = await profilesContainer.item(matchToDelete.player2_id, matchToDelete.player2_id).read();
        if (player2Profile) {
          const isPlayer2Winner = matchToDelete.player2_id === matchToDelete.winner_id;
          await profilesContainer.item(matchToDelete.player2_id, matchToDelete.player2_id).replace({
            ...player2Profile,
            matches_played: Math.max(0, (player2Profile.matches_played || 0) - 1),
            matches_won: isPlayer2Winner ? Math.max(0, (player2Profile.matches_won || 0) - 1) : (player2Profile.matches_won || 0),
          });
        }
      } else if (matchToDelete.match_type === 'doubles' && 
                matchToDelete.team1_player1_id && 
                matchToDelete.team1_player2_id && 
                matchToDelete.team2_player1_id && 
                matchToDelete.team2_player2_id) {
        // Update stats for all 4 players in the doubles match
        const team1PlayerIds = [matchToDelete.team1_player1_id, matchToDelete.team1_player2_id];
        const team2PlayerIds = [matchToDelete.team2_player1_id, matchToDelete.team2_player2_id];
        
        // Update team 1 players
        for (const playerId of team1PlayerIds) {
          const { resource: profile } = await profilesContainer.item(playerId, playerId).read();
          if (profile) {
            // Fixed: Use winner_team instead of winning_team
            const isWinner = matchToDelete.winner_team === 'team1';
            await profilesContainer.item(playerId, playerId).replace({
              ...profile,
              doubles_matches_played: Math.max(0, (profile.doubles_matches_played || 0) - 1),
              doubles_matches_won: isWinner ? Math.max(0, (profile.doubles_matches_won || 0) - 1) : (profile.doubles_matches_won || 0),
            });
          }
        }
        
        // Update team 2 players
        for (const playerId of team2PlayerIds) {
          const { resource: profile } = await profilesContainer.item(playerId, playerId).read();
          if (profile) {
            // Fixed: Use winner_team instead of winning_team
            const isWinner = matchToDelete.winner_team === 'team2';
            await profilesContainer.item(playerId, playerId).replace({
              ...profile,
              doubles_matches_played: Math.max(0, (profile.doubles_matches_played || 0) - 1),
              doubles_matches_won: isWinner ? Math.max(0, (profile.doubles_matches_won || 0) - 1) : (profile.doubles_matches_won || 0),
            });
          }
        }
      }
      
      // Update the UI by removing the deleted match
      setMatches(matches.filter(match => match.id !== matchId));
      setConfirmDelete(null);
      
    } catch (err: any) {
      console.error('Error deleting match:', err);
      setError(`Failed to delete match: ${err.message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">All Matches</h1>
        <button
          onClick={() => navigate('/new-match')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Record New Match
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {matches.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No matches have been recorded yet.</p>
          <button
            onClick={() => navigate('/new-match')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Record First Match
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Match Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Players
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Winner
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {matches.map((match) => (
                <tr key={match.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                    {match.match_type}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {match.match_type === 'singles' ? (
                      <span>{match.player1Name} vs {match.player2Name}</span>
                    ) : (
                      <div>
                        <div>{match.team1Player1Name} / {match.team1Player2Name}</div>
                        <div>vs</div>
                        <div>{match.team2Player1Name} / {match.team2Player2Name}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {match.match_type === 'singles' ? (
                      <span>{match.player1_score} - {match.player2_score}</span>
                    ) : (
                      <span>{match.team1_score} - {match.team2_score}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {match.match_type === 'singles' ? (
                      <span className="font-medium text-green-600">{match.winnerName}</span>
                    ) : (
                      <span className="font-medium text-green-600">
                        {match.winner_team === 'team1' ? 
                          `${match.team1Player1Name} / ${match.team1Player2Name}` : 
                          `${match.team2Player1Name} / ${match.team2Player2Name}`}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(match.played_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {confirmDelete === match.id ? (
                      <div className="flex justify-end items-center space-x-2">
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteMatch(match.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={deleteLoading === match.id}
                        >
                          {deleteLoading === match.id ? 'Deleting...' : 'Confirm'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDeleteMatch(match.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {matches.length > 0 && (
        <div className="mt-4 text-sm text-gray-500">
          Showing {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </div>
      )}
    </div>
  );
}

export default AllMatches;