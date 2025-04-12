import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Register() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      // With Azure AD, we don't need separate registration - just sign in
      await login();
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
        <p className="text-gray-600 mt-2">Create or link your Microsoft account</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            The Ping Pong Tracker app uses Azure AD for authentication. Click the button below to sign in or register with your Microsoft account.
          </p>
          
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? (
              <div className="w-5 h-5 border-b-2 border-white rounded-full animate-spin"></div>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" viewBox="0 0 23 23">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z"></path>
                  <path fill="#f35325" d="M1 1h10v10H1z"></path>
                  <path fill="#81bc06" d="M12 1h10v10H12z"></path>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"></path>
                  <path fill="#ffba08" d="M12 12h10v10H12z"></path>
                </svg>
                Sign in with Microsoft
              </>
            )}
          </button>
        </div>

        <div className="text-center text-gray-600">
          <p>
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:underline">
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;