import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const { user, login, error: authError, loading } = useAuth();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState<boolean>(false);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      console.log("User already logged in, redirecting to home page");
      navigate('/');
    }
  }, [user, navigate]);

  // Clear errors when component mounts
  useEffect(() => {
    setLoginError(null);
  }, []);

  const handleLogin = async () => {
    setLoginError(null);
    setLoggingIn(true);
    
    try {
      console.log("Login button clicked - starting authentication flow");
      await login();
      // Note: With redirect auth, this code below won't execute
      // The redirect happens in the login() function
      // Redirection will be handled by the useEffect above when redirected back
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError(`Failed to sign in: ${err.message || 'Unknown error'}`);
    } finally {
      setLoggingIn(false);
    }
  };

  // Display a more detailed error message
  const displayError = loginError || authError;

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-0">
      <div className="text-center mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sign In</h1>
        <p className="text-sm md:text-base text-gray-600 mt-2">Sign in to your account</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        {displayError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {displayError}
          </div>
        )}

        {loggingIn && !loading && (
          <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded text-sm">
            Authentication in progress... If you're seeing this for an extended period, please check your browser's popup blocker.
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm md:text-base text-gray-600 mb-4">
            The Ping Pong Tracker app uses Microsoft Azure AD for authentication. Click the button below to sign in with your Microsoft account.
          </p>
          
          <button
            onClick={handleLogin}
            disabled={loading || loggingIn}
            className="w-full flex justify-center items-center py-2 md:py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {(loading || loggingIn) ? (
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

        <div className="text-center text-gray-600 text-sm md:text-base">
          <p>
            Don't have an account?{' '}
            <a href="/register" className="text-blue-600 hover:underline">
              Create one here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;