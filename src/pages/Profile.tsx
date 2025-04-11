import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Table as TableTennis } from 'lucide-react';

interface Profile {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  matches_played: number;
  matches_won: number;
}

function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError("Not authenticated");
          setLoading(false);
          return;
        }

        // Only fetch the profile
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          // If the profile doesn't exist at this point, something is wrong
          // The trigger should have created it
          console.error('Profile fetch error:', fetchError);
          setError(fetchError.message);
        } else {
          setProfile(data);
        }
      } catch (error: any) {
        console.error('Error in profile component:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8">
        <div className="flex items-center justify-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.username}
              className="h-24 w-24 rounded-full border-4 border-white"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-4xl text-white">{profile.username[0].toUpperCase()}</span>
            </div>
          )}
        </div>
        <h1 className="text-center text-2xl font-bold text-white mt-4">{profile.username}</h1>
        {profile.full_name && (
          <p className="text-center text-white/80 mt-1">{profile.full_name}</p>
        )}
      </div>

      <div className="px-6 py-8">
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-center mb-2">
              <TableTennis className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{profile.matches_played}</p>
            <p className="text-sm text-gray-600">Matches Played</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-center mb-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{profile.matches_won}</p>
            <p className="text-sm text-gray-600">Matches Won</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistics</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Win Rate</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-2.5 rounded-full"
                  style={{
                    width: `${profile.matches_played > 0
                      ? ((profile.matches_won / profile.matches_played) * 100).toFixed(1)
                      : 0}%`
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-900 mt-1">
                {profile.matches_played > 0
                  ? `${((profile.matches_won / profile.matches_played) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;