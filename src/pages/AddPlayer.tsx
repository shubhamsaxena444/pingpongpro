import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { getCosmosDB } from '../lib/cosmosdb';

function AddPlayer() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const cosmosDB = await getCosmosDB();
      const profilesContainer = cosmosDB.containers.profiles;
      
      // Check if username already exists
      const { resources: existingProfiles } = await profilesContainer.items
        .query({
          query: "SELECT * FROM c WHERE c.username = @username",
          parameters: [{ name: "@username", value: username }]
        })
        .fetchAll();
      
      if (existingProfiles.length > 0) {
        setError('Username already exists. Please choose a different one.');
        return;
      }

      // Generate a UUID for the player
      const playerId = crypto.randomUUID();
      
      // Create new player profile
      const newPlayer = {
        id: playerId,
        username: username,
        displayName: fullName || username,
        email: null,
        matches_played: 0,
        matches_won: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add to Cosmos DB
      await profilesContainer.items.create(newPlayer);

      setSuccess(`Player "${username}" added successfully!`);
      
      // Reset form
      setUsername('');
      setFullName('');
      
      // Removed automatic navigation to leaderboard
      // Now user stays on the Add Player page
      
    } catch (err: any) {
      console.error('Error adding player:', err);
      setError(err.message || 'Failed to add player');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-0">
      <div className="text-center mb-6 md:mb-8">
        <div className="flex justify-center mb-3 md:mb-4">
          <UserPlus className="h-10 w-10 md:h-12 md:w-12 text-green-500" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Add New Player</h1>
        <p className="text-sm md:text-base text-gray-600 mt-2">Create a new player for matches</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 md:px-4 md:py-3 rounded mb-4 text-sm md:text-base">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 md:px-4 md:py-3 rounded mb-4 text-sm md:text-base">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
              Username *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
              Full Name (optional)
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
            />
          </div>
        </div>

        <div className="mt-5 md:mt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 text-sm md:text-base"
          >
            {loading ? 'Adding...' : 'Add Player'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddPlayer;