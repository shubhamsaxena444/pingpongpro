import { config } from './config';

// Interface for Azure OpenAI configuration
interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  modelName: string;
  deploymentName: string;
  apiVersion: string;
}

// Match summary request interface
interface MatchSummaryRequest {
  matchType: 'singles' | 'doubles';
  player1Name?: string;
  player2Name?: string;
  player1Score?: number;
  player2Score?: number;
  team1Player1Name?: string;
  team1Player2Name?: string;
  team2Player1Name?: string;
  team2Player2Name?: string;
  team1Score?: number;
  team2Score?: number;
  winnerName?: string;
  winnerTeamNames?: string[];
  commentatorName?: string; // Added commentator name field
}

// Leaderboard summary request interface
interface LeaderboardSummaryRequest {
  leaderboardType: 'singles' | 'doubles' | 'teams';
  viewType: 'wins' | 'points';
  topPlayers: any[]; // Top 5 players or teams from the leaderboard
  totalPlayers: number; // Total count of players or teams
}

/**
 * Generate an AI summary of a table tennis match
 * @param matchDetails Details about the match
 * @returns Promise with the generated summary text
 */
export async function generateMatchSummary(matchDetails: MatchSummaryRequest): Promise<string> {
  try {
    const azureConfig = getAzureOpenAIConfig();
    if (!isConfigValid(azureConfig)) {
      return "Match summary unavailable (Azure OpenAI not configured)";
    }

    const { endpoint, apiKey, deploymentName, apiVersion } = azureConfig;
    // Remove trailing slashes from endpoint to avoid double slash issues
    const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const url = `${cleanEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

    console.log('Azure OpenAI request URL:', url);

    // Build the system prompt based on commentator name if provided
    let systemPrompt = "You are an enthusiastic table tennis commentator who writes brief, exciting summaries of matches.";
    
    // Add commentator-specific style guidance if commentator name is provided
    if (matchDetails.commentatorName) {
      systemPrompt += ` You are emulating the style of ${matchDetails.commentatorName}.`;
      
      // Add specific style instructions for known commentators
      if (matchDetails.commentatorName.toLowerCase() === "siddhu") {
        systemPrompt += " Start your commentary with 'O guru!' and use exaggerated expressions throughout.";
      } else if (matchDetails.commentatorName.toLowerCase() === "john mcenroe") {
        systemPrompt += " Use passionate and sometimes controversial commentary with phrases like 'You cannot be serious!' when appropriate.";
      } else if (matchDetails.commentatorName.toLowerCase() === "tony romo") {
        systemPrompt += " Include predictive analysis and excited exclamations in your commentary style.";
      }
    }

    let promptText = '';
    if (matchDetails.matchType === 'singles') {
      promptText = `
      Write a brief, exciting sports commentary style summary (2-3 sentences) of a table tennis match with these details:
      Player 1: ${matchDetails.player1Name}
      Player 2: ${matchDetails.player2Name}
      Final Score: ${matchDetails.player1Score}-${matchDetails.player2Score}
      Winner: ${matchDetails.winnerName}
      ${matchDetails.commentatorName ? `Commentator: ${matchDetails.commentatorName}` : ''}
      
      Be creative, enthusiastic, and mention the score. Don't use placeholder text.
      `;
    } else {
      promptText = `
      Write a brief, exciting sports commentary style summary (2-3 sentences) of a table tennis doubles match with these details:
      Team 1: ${matchDetails.team1Player1Name} & ${matchDetails.team1Player2Name}
      Team 2: ${matchDetails.team2Player1Name} & ${matchDetails.team2Player2Name}
      Final Score: ${matchDetails.team1Score}-${matchDetails.team2Score}
      Winners: ${matchDetails.winnerTeamNames?.join(' & ')}
      ${matchDetails.commentatorName ? `Commentator: ${matchDetails.commentatorName}` : ''}
      
      Be creative, enthusiastic, and mention the score. Don't use placeholder text.
      `;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptText }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI API error:', errorText);
      return "Match summary unavailable (API error)";
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating match summary:', error);
    return "Match summary unavailable (Error occurred)";
  }
}

/**
 * Generate an AI summary of a leaderboard
 * @param leaderboardDetails Details about the leaderboard
 * @returns Promise with the generated summary text
 */
export async function generateLeaderboardSummary(leaderboardDetails: LeaderboardSummaryRequest): Promise<string> {
  try {
    const azureConfig = getAzureOpenAIConfig();
    if (!isConfigValid(azureConfig)) {
      return "Leaderboard summary unavailable (Azure OpenAI not configured)";
    }

    const { endpoint, apiKey, deploymentName, apiVersion } = azureConfig;
    // Remove trailing slashes from endpoint to avoid double slash issues
    const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const url = `${cleanEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

    console.log('Azure OpenAI leaderboard summary request URL:', url);

    const systemPrompt = "You are an insightful table tennis analyst who provides brief, data-driven summaries of leaderboard standings. You highlight trends, notable performances, and interesting statistics.";
    
    // Format the top players data for the prompt
    const topPlayersText = leaderboardDetails.topPlayers.map((player, index) => {
      if (leaderboardDetails.leaderboardType === 'singles') {
        return `#${index + 1}: ${player.username || player.displayName} - ${leaderboardDetails.viewType === 'wins' ? 
          `${player.matches_won} wins (${player.win_rate}% win rate)` : 
          `${player.point_differential > 0 ? '+' : ''}${player.point_differential} point differential`}`;
      } else if (leaderboardDetails.leaderboardType === 'doubles') {
        return `#${index + 1}: ${player.username || player.displayName} - ${leaderboardDetails.viewType === 'wins' ? 
          `${player.doubles_matches_won} wins (${player.doubles_win_rate}% win rate)` : 
          `${player.doubles_point_differential > 0 ? '+' : ''}${player.doubles_point_differential} point differential`}`;
      } else { // teams
        return `#${index + 1}: ${player.player1Name} & ${player.player2Name} - ${leaderboardDetails.viewType === 'wins' ? 
          `${player.matches_won} wins (${player.win_rate}% win rate)` : 
          `${player.point_differential > 0 ? '+' : ''}${player.point_differential} point differential`}`;
      }
    }).join('\n');

    const promptText = `
    Generate a brief (3-4 sentences) analytical summary of the current table tennis ${leaderboardDetails.leaderboardType} leaderboard:
    
    Leaderboard type: ${leaderboardDetails.leaderboardType}
    View type: ${leaderboardDetails.viewType} (${leaderboardDetails.viewType === 'wins' ? 'win rate' : 'point differential'})
    Total participants: ${leaderboardDetails.totalPlayers}
    
    Top participants:
    ${topPlayersText}
    
    Focus on: current standings, notable performances, interesting trends, and what makes the top players successful.
    Keep your analysis brief but insightful. Include the date April 13, 2025 as the current date.
    `;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptText }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI API error:', errorText);
      return "Leaderboard summary unavailable (API error)";
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating leaderboard summary:', error);
    return "Leaderboard summary unavailable (Error occurred)";
  }
}

/**
 * Check if Azure OpenAI configuration is valid and complete
 */
function isConfigValid(config: AzureOpenAIConfig): boolean {
  return !!(config.apiKey && config.endpoint && config.deploymentName);
}

/**
 * Get Azure OpenAI configuration from environment 
 */
function getAzureOpenAIConfig(): AzureOpenAIConfig {
  // Use model name for deployment if not explicitly configured
  const modelName = config.azureOpenai?.modelName || 'gpt-35-turbo';
  const deploymentName = config.azureOpenai?.deploymentName || modelName;
  
  return {
    apiKey: config.azureOpenai?.apiKey || '',
    endpoint: config.azureOpenai?.endpoint || '',
    modelName: modelName,
    deploymentName: deploymentName,
    apiVersion: config.azureOpenai?.apiVersion || '2023-05-15'
  };
}