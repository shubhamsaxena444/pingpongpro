import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCosmosDB } from '../lib/cosmosdb';
import { useAuth } from '../contexts/AuthContext';
import { 
  updateSinglesRating, 
  updateDoublesRating
} from '../lib/rating';
import { generateMatchSummary } from '../lib/azureOpenai';

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
  
  // Match type state
  const [matchType, setMatchType] = useState<'singles' | 'doubles'>('singles');
  
  // Singles match state
  const [player1, setPlayer1] = useState<string>('');
  const [player2, setPlayer2] = useState<string>('');
  const [player1Score, setPlayer1Score] = useState<number>(0);
  const [player2Score, setPlayer2Score] = useState<number>(0);
  
  // Doubles match state
  const [team1Player1, setTeam1Player1] = useState<string>('');
  const [team1Player2, setTeam1Player2] = useState<string>('');
  const [team2Player1, setTeam2Player1] = useState<string>('');
  const [team2Player2, setTeam2Player2] = useState<string>('');
  const [team1Score, setTeam1Score] = useState<number>(0);
  const [team2Score, setTeam2Score] = useState<number>(0);
  
  // Commentator name for custom summary
  const [commentatorName, setCommentatorName] = useState<string>('');
  
  // Match summary state
  const [matchSummary, setMatchSummary] = useState<string>('');
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [generatingSummary, setGeneratingSummary] = useState<boolean>(false);

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

  const handleSubmitSingles = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if the same player is selected for both positions
    if (player1 === player2) {
      setError('Please select different players.');
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
      
      // Determine the winning player
      const winningPlayer = player1Score > player2Score ? player1 : player2;
      
      // Get player names for summary
      const player1Name = players.find(p => p.id === player1)?.displayName || players.find(p => p.id === player1)?.username || 'Player 1';
      const player2Name = players.find(p => p.id === player2)?.displayName || players.find(p => p.id === player2)?.username || 'Player 2';
      
      // Create match record
      const matchId = crypto.randomUUID();
      const matchData: {
        id: string;
        player1_id: string;
        player2_id: string;
        player1_score: number;
        player2_score: number;
        winner_id: string;
        created_by: string | null;
        played_at: string;
        match_type: string;
        match_summary?: string; // Make the summary property optional
      } = {
        id: matchId,
        player1_id: player1,
        player2_id: player2,
        player1_score: player1Score,
        player2_score: player2Score,
        winner_id: winningPlayer,
        created_by: user?.id || null,
        played_at: new Date().toISOString(),
        match_type: 'singles' // Specify this is a singles match
      };
      
      // Generate match summary
      setGeneratingSummary(true);
      // Get the winner's name
      const winnerName = players.find(p => p.id === winningPlayer)?.displayName?.split(' ')[0] || 
                        players.find(p => p.id === winningPlayer)?.username?.split(' ')[0] || 
                        (winningPlayer === player1 ? 'Player 1' : 'Player 2');
      // Get first names only for the players
      const player1FirstName = player1Name.split(' ')[0];
      const player2FirstName = player2Name.split(' ')[0];
      
      const summary = await generateMatchSummary({
        matchType: 'singles',
        player1Name: player1FirstName,
        player2Name: player2FirstName,
        player1Score,
        player2Score,
        winnerName, // Correctly use winnerName instead of winningPlayerId
        commentatorName: commentatorName || undefined  // Pass commentator name if provided
      });
      
      // Store the summary in match data if generated
      if (summary && summary !== "Match summary unavailable (Azure OpenAI not configured)") {
        matchData.match_summary = summary; // Changed from .summary to .match_summary
      }
      
      // Add match to Cosmos DB
      await matchesContainer.items.create(matchData);
      
      // Get player scores based on their IDs
      const player1PointsScored = player1Score;
      const player1PointsConceded = player2Score;
      const player2PointsScored = player2Score;
      const player2PointsConceded = player1Score;
      
      // Update player 1 statistics with rating
      const { resource: player1Profile } = await profilesContainer.item(player1, player1).read();
      if (player1Profile) {
        const isPlayer1Winner = player1 === winningPlayer;
        const updatedPlayer1Profile = updateSinglesRating(
          player1Profile,
          player1PointsScored,
          player1PointsConceded,
          isPlayer1Winner
        );
        
        await profilesContainer.item(player1, player1).replace({
          ...updatedPlayer1Profile,
          matches_played: (player1Profile.matches_played || 0) + 1,
          matches_won: isPlayer1Winner ? (player1Profile.matches_won || 0) + 1 : (player1Profile.matches_won || 0),
        });
      }
      
      // Update player 2 statistics with rating
      const { resource: player2Profile } = await profilesContainer.item(player2, player2).read();
      if (player2Profile) {
        const isPlayer2Winner = player2 === winningPlayer;
        const updatedPlayer2Profile = updateSinglesRating(
          player2Profile,
          player2PointsScored,
          player2PointsConceded,
          isPlayer2Winner
        );
        
        await profilesContainer.item(player2, player2).replace({
          ...updatedPlayer2Profile,
          matches_played: (player2Profile.matches_played || 0) + 1,
          matches_won: isPlayer2Winner ? (player2Profile.matches_won || 0) + 1 : (player2Profile.matches_won || 0),
        });
      }
      
      // Save summary and show it
      setMatchSummary(summary);
      setShowSummary(true);
      setGeneratingSummary(false);
      
      // Don't immediately navigate to leaderboard, show summary first
      // User will go to leaderboard after viewing summary
      
    } catch (err: any) {
      console.error('Error submitting match:', err);
      setError(err.message || 'Failed to submit match');
      setGeneratingSummary(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDoubles = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if the same player is selected for multiple positions
    const selectedPlayers = [team1Player1, team1Player2, team2Player1, team2Player2];
    const uniquePlayers = new Set(selectedPlayers);
    
    if (uniquePlayers.size !== 4) {
      setError('Please select different players for each position.');
      return;
    }
    
    if (team1Score === team2Score) {
      setError('The match cannot end in a tie. One team must win.');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const cosmosDB = await getCosmosDB();
      const matchesContainer = cosmosDB.containers.matches;
      const profilesContainer = cosmosDB.containers.profiles; // Fixed: Added missing profilesContainer
      
      // Determine winning team
      const winningTeam = team1Score > team2Score ? 'team1' : 'team2';
      
      // Get player names for summary
      const team1Player1Name = players.find(p => p.id === team1Player1)?.displayName || players.find(p => p.id === team1Player1)?.username || 'Team 1 Player 1';
      const team1Player2Name = players.find(p => p.id === team1Player2)?.displayName || players.find(p => p.id === team1Player2)?.username || 'Team 1 Player 2';
      const team2Player1Name = players.find(p => p.id === team2Player1)?.displayName || players.find(p => p.id === team2Player1)?.username || 'Team 2 Player 1';
      const team2Player2Name = players.find(p => p.id === team2Player2)?.displayName || players.find(p => p.id === team2Player2)?.username || 'Team 2 Player 2';
      
      // Create match record
      const matchId = crypto.randomUUID();
      const matchData: {
        id: string;
        team1_player1_id: string;
        team1_player2_id: string;
        team2_player1_id: string;
        team2_player2_id: string;
        team1_score: number;
        team2_score: number;
        winner_team: string; // Changed from winning_team to winner_team for consistency
        created_by: string | null;
        played_at: string;
        match_type: string;
        match_summary?: string;
      } = {
        id: matchId,
        team1_player1_id: team1Player1,
        team1_player2_id: team1Player2,
        team2_player1_id: team2Player1,
        team2_player2_id: team2Player2,
        team1_score: team1Score,
        team2_score: team2Score,
        winner_team: winningTeam, // Changed from winning_team to winner_team
        created_by: user?.id || null,
        played_at: new Date().toISOString(),
        match_type: 'doubles' // Specify this is a doubles match
      };
      
      // Generate match summary
      setGeneratingSummary(true);
      
      // Extract first names only for team players
      const team1Player1FirstName = team1Player1Name.split(' ')[0];
      const team1Player2FirstName = team1Player2Name.split(' ')[0];
      const team2Player1FirstName = team2Player1Name.split(' ')[0];
      const team2Player2FirstName = team2Player2Name.split(' ')[0];
      
      // Determine winning team names
      const winnerTeamNames = winningTeam === 'team1' 
        ? [team1Player1FirstName, team1Player2FirstName]
        : [team2Player1FirstName, team2Player2FirstName];
        
      const summary = await generateMatchSummary({
        matchType: 'doubles',
        team1Player1Name: team1Player1FirstName,
        team1Player2Name: team1Player2FirstName,
        team2Player1Name: team2Player1FirstName,
        team2Player2Name: team2Player2FirstName,
        team1Score,
        team2Score,
        winnerTeamNames, // Use the determined winner team names
        commentatorName: commentatorName || undefined  // Pass commentator name if provided
      });
      
      // Store the summary in match data if generated
      if (summary && summary !== "Match summary unavailable (Azure OpenAI not configured)") {
        // Add summary to match data (using same field name as singles matches)
        await matchesContainer.items.create({
          ...matchData,
          match_summary: summary // Assign the summary to match_summary field
        });
      } else {
        // Add match without summary
        await matchesContainer.items.create(matchData);
      }
      
      // Calculate points per player in doubles matches (divide team score)
      // Players on the same team earn equal points
      const team1PlayerPointsScored = team1Score / 2;
      const team1PlayerPointsConceded = team2Score / 2;
      const team2PlayerPointsScored = team2Score / 2;
      const team2PlayerPointsConceded = team1Score / 2;
      
      // Update player statistics for team 1 players
      const team1PlayerIds = [team1Player1, team1Player2];
      for (const playerId of team1PlayerIds) {
        const { resource: profile } = await profilesContainer.item(playerId, playerId).read();
        if (profile) {
          const isWinner = winningTeam === 'team1';
          
          // Get the team partner ID - the other player in the team
          const partnerId = playerId === team1Player1 ? team1Player2 : team1Player1;
          
          // Create updated profile with team partners section
          const updatedProfile = {
            ...profile,
            team_partners: { ...(profile.team_partners || {}) }
          };
          
          // Update or create team partners stats
          if (!updatedProfile.team_partners[partnerId]) {
            updatedProfile.team_partners[partnerId] = {
              partnerId: partnerId,
              matches_played: 0,
              matches_won: 0,
              team_rating: 1200,
              points_scored: 0,
              points_conceded: 0,
              last_played: new Date().toISOString()
            };
          }
          
          // Update existing team partner stats
          const teamStats = updatedProfile.team_partners[partnerId];
          teamStats.matches_played += 1;
          if (isWinner) teamStats.matches_won += 1;
          teamStats.points_scored += team1Score;
          teamStats.points_conceded += team2Score;
          teamStats.last_played = new Date().toISOString();
          
          // Simple rating update for team rating
          teamStats.team_rating += isWinner ? 15 : -15;
          
          const updatedProfile2 = updateDoublesRating(
            updatedProfile,
            team1PlayerPointsScored,
            team1PlayerPointsConceded,
            isWinner,
            partnerId  // Use actual partner ID instead of hardcoded 'doubles'
          );
          
          await profilesContainer.item(playerId, playerId).replace({
            ...updatedProfile2,
            doubles_matches_played: (profile.doubles_matches_played || 0) + 1,
            doubles_matches_won: isWinner ? (profile.doubles_matches_won || 0) + 1 : (profile.doubles_matches_won || 0),
          });
        }
      }
      
      // Update player statistics for team 2 players
      const team2PlayerIds = [team2Player1, team2Player2];
      for (const playerId of team2PlayerIds) {
        const { resource: profile } = await profilesContainer.item(playerId, playerId).read();
        if (profile) {
          const isWinner = winningTeam === 'team2';
          
          // Get the team partner ID - the other player in the team
          const partnerId = playerId === team2Player1 ? team2Player2 : team2Player1;
          
          // Create updated profile with team partners section
          const updatedProfile = {
            ...profile,
            team_partners: { ...(profile.team_partners || {}) }
          };
          
          // Update or create team partners stats
          if (!updatedProfile.team_partners[partnerId]) {
            updatedProfile.team_partners[partnerId] = {
              partnerId: partnerId,
              matches_played: 0,
              matches_won: 0,
              team_rating: 1200,
              points_scored: 0,
              points_conceded: 0,
              last_played: new Date().toISOString()
            };
          }
          
          // Update existing team partner stats
          const teamStats = updatedProfile.team_partners[partnerId];
          teamStats.matches_played += 1;
          if (isWinner) teamStats.matches_won += 1;
          teamStats.points_scored += team2Score;
          teamStats.points_conceded += team1Score;
          teamStats.last_played = new Date().toISOString();
          
          // Simple rating update for team rating
          teamStats.team_rating += isWinner ? 15 : -15;
          
          const updatedProfile2 = updateDoublesRating(
            updatedProfile,
            team2PlayerPointsScored,
            team2PlayerPointsConceded,
            isWinner,
            partnerId  // Use actual partner ID instead of hardcoded 'doubles'
          );
          
          await profilesContainer.item(playerId, playerId).replace({
            ...updatedProfile2,
            doubles_matches_played: (profile.doubles_matches_played || 0) + 1,
            doubles_matches_won: isWinner ? (profile.doubles_matches_won || 0) + 1 : (profile.doubles_matches_won || 0),
          });
        }
      }
      
      // Save summary and show it
      setMatchSummary(summary);
      setShowSummary(true);
      setGeneratingSummary(false);
      
      // Don't immediately navigate to leaderboard, show summary first
      
    } catch (err: any) {
      console.error('Error submitting doubles match:', err);
      setError(err.message || 'Failed to submit match');
      setGeneratingSummary(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (matchType === 'singles') {
      handleSubmitSingles(e);
    } else {
      handleSubmitDoubles(e);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-0">
      <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8">Record New Match</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 md:px-4 md:py-3 rounded mb-4 text-sm md:text-base">
          {error}
        </div>
      )}
      
      {showSummary ? (
        // Match summary display
        <div className="bg-white rounded-lg shadow-md p-4 md:p-8 text-center">
          <div className="mb-4">
            <div className="inline-block p-3 rounded-full bg-green-100 text-green-500 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-2">Match Recorded Successfully!</h2>
            <p className="text-gray-600">The match has been recorded and player statistics updated.</p>
          </div>
          
          <div className="mb-6 bg-blue-50 rounded-lg p-4 md:p-6 mt-4">
            <h3 className="font-medium text-blue-700 mb-2">AI Match Summary</h3>
            <div className="italic text-gray-700 text-sm md:text-base">
              {generatingSummary ? (
                <div className="flex items-center justify-center">
                  <span>Generating summary</span>
                  <span className="animate-pulse">...</span>
                </div>
              ) : (
                matchSummary || "No match summary available."
              )}
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/leaderboard')}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              View Leaderboard
            </button>
            <button
              onClick={() => {
                // Reset form and summary
                setShowSummary(false);
                setMatchSummary('');
                
                if (matchType === 'singles') {
                  setPlayer1('');
                  setPlayer2('');
                  setPlayer1Score(0);
                  setPlayer2Score(0);
                } else {
                  setTeam1Player1('');
                  setTeam1Player2('');
                  setTeam2Player1('');
                  setTeam2Player2('');
                  setTeam1Score(0);
                  setTeam2Score(0);
                }
              }}
              className="inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Record Another Match
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
          <div className="flex mb-6 border-b">
            <button
              type="button"
              onClick={() => setMatchType('singles')}
              className={`flex-1 py-2 px-4 text-center ${
                matchType === 'singles'
                  ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Singles Match
            </button>
            <button
              type="button"
              onClick={() => setMatchType('doubles')}
              className={`flex-1 py-2 px-4 text-center ${
                matchType === 'doubles'
                  ? 'border-b-2 border-blue-500 text-blue-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Doubles Match
            </button>
          </div>
          
          {matchType === 'singles' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Player 1
                  </label>
                  <select
                    value={player1}
                    onChange={(e) => setPlayer1(e.target.value)}
                    className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Player 2
                  </label>
                  <select
                    value={player2}
                    onChange={(e) => setPlayer2(e.target.value)}
                    className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Player 1 Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={player1Score}
                    onChange={(e) => setPlayer1Score(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Player 2 Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={player2Score}
                    onChange={(e) => setPlayer2Score(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Commentator Name (Optional)
                </label>
                <input
                  type="text"
                  value={commentatorName}
                  onChange={(e) => setCommentatorName(e.target.value)}
                  placeholder="e.g. Siddhu, John McEnroe"
                  className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter a commentator name to personalize the match summary style
                </p>
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
              >
                {submitting ? 'Recording Match...' : 'Record Match'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800 mb-2">Team 1</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Player 1
                    </label>
                    <select
                      value={team1Player1}
                      onChange={(e) => setTeam1Player1(e.target.value)}
                      className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Player 2
                    </label>
                    <select
                      value={team1Player2}
                      onChange={(e) => setTeam1Player2(e.target.value)}
                      className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
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
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-800 mb-2">Team 2</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Player 1
                    </label>
                    <select
                      value={team2Player1}
                      onChange={(e) => setTeam2Player1(e.target.value)}
                      className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Player 2
                    </label>
                    <select
                      value={team2Player2}
                      onChange={(e) => setTeam2Player2(e.target.value)}
                      className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Team 1 Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={team1Score}
                    onChange={(e) => setTeam1Score(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                    Team 2 Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={team2Score}
                    onChange={(e) => setTeam2Score(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Commentator Name (Optional)
                </label>
                <input
                  type="text"
                  value={commentatorName}
                  onChange={(e) => setCommentatorName(e.target.value)}
                  placeholder="e.g. Siddhu, John McEnroe"
                  className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                />
                <p className="mt-1 text-xs text-gray-500">Add a commentator to style the match summary</p>
              </div>
              
              <div className="mt-4 md:mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 text-sm md:text-base"
                >
                  {submitting ? 'Submitting...' : 'Submit Doubles Match'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default NewMatch;