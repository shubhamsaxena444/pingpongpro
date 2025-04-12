import { IProfile } from './cosmosdb';

// Constants for rating calculations
const INITIAL_RATING = 1200; // Starting rating for new players
const POINT_FACTOR = 10; // Base points per point scored/conceded
const WIN_BONUS = 25; // Bonus for winning a match
const MAX_RATING_CHANGE = 100; // Cap the max rating change per match
const MIN_RATING = 800; // Minimum possible rating

/**
 * Calculate player rating change based on points scored and conceded
 * @param pointsScored Number of points scored by the player
 * @param pointsConceded Number of points conceded by the player
 * @param isWinner Whether the player won the match
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
 * Get the current rating for a player or the initial rating if none exists
 * @param profile Player profile
 * @returns Current player rating
 */
export const getCurrentRating = (profile: IProfile): number => {
  return profile.rating ?? INITIAL_RATING;
};

/**
 * Update a player's rating based on match performance
 * @param profile Player profile
 * @param pointsScored Points scored in this match
 * @param pointsConceded Points conceded in this match
 * @param isWinner Whether the player won the match
 * @param isDoubles Whether this was a doubles match
 * @returns Updated profile with new rating
 */
export const updatePlayerRating = (
  profile: IProfile,
  pointsScored: number,
  pointsConceded: number,
  isWinner: boolean,
  isDoubles: boolean
): IProfile => {
  const currentRating = getCurrentRating(profile);
  const ratingChange = calculateRatingChange(pointsScored, pointsConceded, isWinner);
  const newRating = Math.max(currentRating + ratingChange, MIN_RATING);
  
  // Update point statistics
  const singles_points_scored = isDoubles ? 
    (profile.singles_points_scored || 0) : 
    (profile.singles_points_scored || 0) + pointsScored;
    
  const singles_points_conceded = isDoubles ? 
    (profile.singles_points_conceded || 0) : 
    (profile.singles_points_conceded || 0) + pointsConceded;
    
  const doubles_points_scored = isDoubles ? 
    (profile.doubles_points_scored || 0) + pointsScored : 
    (profile.doubles_points_scored || 0);
    
  const doubles_points_conceded = isDoubles ? 
    (profile.doubles_points_conceded || 0) + pointsConceded : 
    (profile.doubles_points_conceded || 0);
  
  return {
    ...profile,
    rating: newRating,
    singles_points_scored,
    singles_points_conceded,
    doubles_points_scored,
    doubles_points_conceded,
    updated_at: new Date().toISOString()
  };
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