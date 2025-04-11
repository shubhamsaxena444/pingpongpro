import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserPlus } from 'lucide-react';

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
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means not found, which is good
        throw checkError;
      }
      
      if (existingUser) {
        setError('Username already exists. Please choose a different one.');
        return;
      }

      // Generate a UUID for the player
      const uuid = crypto.randomUUID();
      
      // Call the RPC function that has SECURITY DEFINER privileges
      const { error: rpcError } = await supabase.rpc('create_profile', {
        user_id: uuid,
        user_username: username,
        user_full_name: fullName || null
      });
      
      if (rpcError) {
        console.error("RPC error:", rpcError);
        throw new Error(`Failed to create player: ${rpcError.message}`);
      }

      setSuccess(`Player "${username}" added successfully!`);
      
      // Reset form
      setUsername('');
      setFullName('');
      
      // Optionally navigate to the leaderboard after a short delay
      setTimeout(() => {
        navigate('/leaderboard');
      }, 2000);
      
    } catch (err: any) {
      console.error('Error adding player:', err);
      setError(err.message || 'Failed to add player');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <UserPlus className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Add New Player</h1>
        <p className="text-gray-600 mt-2">Create a new player for matches</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name (optional)
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-gray-700 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Player'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddPlayer;