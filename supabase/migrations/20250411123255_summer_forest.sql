/*
  # Table Tennis Tracker Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - matches auth.users.id
      - `username` (text, unique)
      - `full_name` (text)
      - `avatar_url` (text)
      - `created_at` (timestamp)
    
    - `matches`
      - `id` (uuid, primary key)
      - `player1_id` (uuid, references profiles)
      - `player2_id` (uuid, references profiles)
      - `player1_score` (integer)
      - `player2_score` (integer)
      - `winner_id` (uuid, references profiles)
      - `played_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  matches_played integer DEFAULT 0,
  matches_won integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create matches table
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id uuid REFERENCES profiles(id) NOT NULL,
  player2_id uuid REFERENCES profiles(id) NOT NULL,
  player1_score integer NOT NULL,
  player2_score integer NOT NULL,
  winner_id uuid REFERENCES profiles(id) NOT NULL,
  played_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can create any profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create a server-side function to create profiles (bypasses RLS)
CREATE OR REPLACE FUNCTION create_profile(
  user_id uuid,
  user_username text,
  user_full_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name)
  VALUES (user_id, user_username, user_full_name)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Profile created successfully'
  );
EXCEPTION
  WHEN others THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

-- Create trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Matches policies
CREATE POLICY "Matches are viewable by everyone"
  ON matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create any match"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update player stats after a match
CREATE OR REPLACE FUNCTION update_player_stats(p1_id uuid, p2_id uuid, winner uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update player 1 stats
  UPDATE profiles
  SET 
    matches_played = matches_played + 1,
    matches_won = CASE WHEN winner = p1_id THEN matches_won + 1 ELSE matches_won END
  WHERE id = p1_id;

  -- Update player 2 stats
  UPDATE profiles
  SET 
    matches_played = matches_played + 1,
    matches_won = CASE WHEN winner = p2_id THEN matches_won + 1 ELSE matches_won END
  WHERE id = p2_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Player stats updated successfully'
  );
END;
$$;