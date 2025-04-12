import { IProfile, TeamPartnerStats } from './cosmosdb';

// Constants for rating calculations
const INITIAL_RATING = 1200; // Starting rating for new players
const INITIAL_TEAM_RATING = 1200; // Starting rating for new teams
const POINT_FACTOR = 10; // Base points per point scored/conceded
const WIN_BONUS = 25; // Bonus for winning a match
const MAX_RATING_CHANGE = 100; // Cap the max rating change per match
const MIN_RATING = 800; // Minimum possible rating
const SINGLES_WEIGHT = 0.6; // Weight for singles in overall rating
const DOUBLES_WEIGHT = 0.4; // Weight for doubles in overall rating

/**
 * Calculate rating change based on points scored and conceded
 * @param pointsScored Number of points scored 
 * @param pointsConceded Number of points conceded
 * @param isWinner Whether the player/team won the match
 * @returns Rating change (positive or negative)
 */
export const calculateRatingChange = (
  pointsScored: number, 
  pointsConceded: number, 
  isWinner: boolean
): number => {
  // Base rating change from points
  let ratingChange = (pointsScored * POINT_FACTOR) - (pointsConceded * POINT_FACTOR);
  
  // Add win bonus if applicable
  if (isWinner) {
    ratingChange += WIN_BONUS;
  }
  
  // Cap the rating change to avoid extreme swings
  return Math.max(Math.min(ratingChange, MAX_RATING_CHANGE), -MAX_RATING_CHANGE);
};

/**
 * Get the current singles rating for a player
 * @param profile Player profile
 * @returns Current singles rating
 */
export const getCurrentSinglesRating = (profile: IProfile): number => {
  return profile.singles_rating ?? INITIAL_RATING;
};

/**
 * Get the current doubles rating for a player
 * @param profile Player profile
 * @returns Current doubles rating
 */
export const getCurrentDoublesRating = (profile: IProfile): number => {
  return profile.doubles_rating ?? INITIAL_RATING;
};

/**
 * Get team rating for a specific partner
 * @param profile Player profile
 * @param partnerId Partner player ID
 * @returns Current team rating with this partner
 */
export const getTeamRating = (profile: IProfile, partnerId: string): number => {
  return profile.team_partners?.[partnerId]?.team_rating ?? INITIAL_TEAM_RATING;
};

/**
 * Calculate overall rating based on singles and doubles ratings
 * @param singlesRating Player's singles rating
 * @param doublesRating Player's doubles rating
 * @returns Weighted overall rating
 */
export const calculateOverallRating = (singlesRating: number, doublesRating: number): number => {
  return Math.round((singlesRating * SINGLES_WEIGHT) + (doublesRating * DOUBLES_WEIGHT));
};

/**
 * Initialize or update team partner stats
 * @param profile Player's profile
 * @param partnerId Partner's ID
 * @param isWinner Whether their team won
 * @param pointsScored Points scored by the team
 * @param pointsConceded Points conceded by the team
 * @returns Updated team partner stats
 */
export const updateTeamPartnerStats = (
  profile: IProfile,
  partnerId: string,
  isWinner: boolean,
  pointsScored: number,
  pointsConceded: number
): TeamPartnerStats => {
  // Get existing stats or initialize new ones
  const existingStats = profile.team_partners?.[partnerId] || {
    partnerId,
    matches_played: 0,
    matches_won: 0,
    team_rating: INITIAL_TEAM_RATING,
    points_scored: 0,
    points_conceded: 0
  };

  // Calculate team rating change
  const ratingChange = calculateRatingChange(pointsScored, pointsConceded, isWinner);
  const newTeamRating = Math.max(existingStats.team_rating + ratingChange, MIN_RATING);
  
  // Update statistics
  return {
    ...existingStats,
    matches_played: existingStats.matches_played + 1,
    matches_won: existingStats.matches_won + (isWinner ? 1 : 0),
    team_rating: newTeamRating,
    points_scored: existingStats.points_scored + pointsScored,
    points_conceded: existingStats.points_conceded + pointsConceded,
    last_played: new Date().toISOString()
  };
};

/**
 * Update a player's singles rating based on match performance
 * @param profile Player profile
 * @param pointsScored Points scored in singles match
 * @param pointsConceded Points conceded in singles match
 * @param isWinner Whether the player won the match
 * @returns Updated profile with new singles rating
 */
export const updateSinglesRating = (
  profile: IProfile,
  pointsScored: number,
  pointsConceded: number,
  isWinner: boolean
): IProfile => {
  // Get current singles rating or initialize
  const currentSinglesRating = getCurrentSinglesRating(profile);
  
  // Calculate rating change based on performance
  const ratingChange = calculateRatingChange(pointsScored, pointsConceded, isWinner);
  const newSinglesRating = Math.max(currentSinglesRating + ratingChange, MIN_RATING);
  
  // Update singles point statistics
  const singles_points_scored = (profile.singles_points_scored || 0) + pointsScored;
  const singles_points_conceded = (profile.singles_points_conceded || 0) + pointsConceded;
  
  // Calculate new overall rating
  const currentDoublesRating = getCurrentDoublesRating(profile);
  const newOverallRating = calculateOverallRating(newSinglesRating, currentDoublesRating);
  
  return {
    ...profile,
    singles_rating: newSinglesRating,
    singles_rating_category: getRatingCategory(newSinglesRating),
    overall_rating: newOverallRating,
    overall_rating_category: getRatingCategory(newOverallRating),
    singles_points_scored,
    singles_points_conceded,
    updated_at: new Date().toISOString()
  };
};

/**
 * Update a player's doubles rating based on match performance
 * @param profile Player profile
 * @param pointsScored Points scored in doubles match
 * @param pointsConceded Points conceded in doubles match
 * @param isWinner Whether the player's team won the match
 * @param partnerId ID of the teammate for this match
 * @returns Updated profile with new doubles rating and team stats
 */
export const updateDoublesRating = (
  profile: IProfile,
  pointsScored: number,
  pointsConceded: number,
  isWinner: boolean,
  partnerId: string
): IProfile => {
  // Get current doubles rating or initialize
  const currentDoublesRating = getCurrentDoublesRating(profile);
  
  // Calculate individual doubles rating change
  const ratingChange = calculateRatingChange(pointsScored, pointsConceded, isWinner);
  const newDoublesRating = Math.max(currentDoublesRating + ratingChange, MIN_RATING);
  
  // Update doubles point statistics
  const doubles_points_scored = (profile.doubles_points_scored || 0) + pointsScored;
  const doubles_points_conceded = (profile.doubles_points_conceded || 0) + pointsConceded;
  
  // Update team-specific statistics with this partner
  const updatedTeamStats = updateTeamPartnerStats(
    profile,
    partnerId,
    isWinner,
    pointsScored * 2, // Full team score for team rating
    pointsConceded * 2 // Full team conceded for team rating
  );
  
  // Initialize or update the team_partners map
  const teamPartners = { 
    ...(profile.team_partners || {}),
    [partnerId]: updatedTeamStats 
  };
  
  // Calculate new overall rating
  const currentSinglesRating = getCurrentSinglesRating(profile);
  const newOverallRating = calculateOverallRating(currentSinglesRating, newDoublesRating);
  
  return {
    ...profile,
    doubles_rating: newDoublesRating,
    doubles_rating_category: getRatingCategory(newDoublesRating),
    overall_rating: newOverallRating,
    overall_rating_category: getRatingCategory(newOverallRating),
    doubles_points_scored,
    doubles_points_conceded,
    team_partners: teamPartners,
    updated_at: new Date().toISOString()
  };
};

/**
 * Update a player's rating based on match performance
 * Common function used by both singles and doubles match processing
 */
export const updatePlayerRating = (
  profile: IProfile,
  pointsScored: number,
  pointsConceded: number,
  isWinner: boolean,
  isDoubles: boolean,
  partnerId?: string
): IProfile => {
  // If doubles match, route to doubles rating function
  if (isDoubles && partnerId) {
    return updateDoublesRating(profile, pointsScored, pointsConceded, isWinner, partnerId);
  }
  
  // Otherwise, use singles rating function
  return updateSinglesRating(profile, pointsScored, pointsConceded, isWinner);
};

/**
 * Get a descriptive rating category based on numerical rating
 * @param rating Numerical rating
 * @returns String representing skill level
 */
export const getRatingCategory = (rating: number): string => {
  if (rating >= 1800) return "Master";
  if (rating >= 1600) return "Expert";
  if (rating >= 1400) return "Advanced";
  if (rating >= 1200) return "Intermediate";
  if (rating >= 1000) return "Beginner";
  return "Novice";
};

/**
 * Get color for displaying rating
 * @param rating Numerical rating
 * @returns Color code for the rating
 */
export const getRatingColor = (rating: number): string => {
  if (rating >= 1800) return "#FF6B00"; // Orange for Master
  if (rating >= 1600) return "#9C27B0"; // Purple for Expert
  if (rating >= 1400) return "#2196F3"; // Blue for Advanced
  if (rating >= 1200) return "#4CAF50"; // Green for Intermediate
  if (rating >= 1000) return "#607D8B"; // Gray for Beginner
  return "#9E9E9E"; // Light Gray for Novice
};