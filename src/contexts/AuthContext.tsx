import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { auth, IUser } from '../lib/auth';

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

// Create the authentication context
const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Initialize MSAL
        auth.initialize();
        
        // Check if user is already signed in
        const currentUser = await auth.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await auth.signIn();
      if (user) {
        setUser(user);
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    setLoading(true);
    
    try {
      await auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError('Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  // Auth context value
  const value = {
    user,
    loading,
    error,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;