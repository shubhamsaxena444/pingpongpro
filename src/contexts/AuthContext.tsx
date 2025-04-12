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
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);

  // Initialize authentication
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Initialize MSAL
        await auth.initialize();
        console.log("Auth initialized in AuthContext");
        
        // Check if user is already signed in
        const currentUser = await auth.getCurrentUser();
        if (currentUser) {
          console.log("User found in AuthContext:", currentUser.name);
          setUser(currentUser);
        } else {
          console.log("No user found in AuthContext");
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
    setIsRedirecting(true);
    
    try {
      console.log("Starting login in AuthContext...");
      // With redirect flow, this will navigate away from the page
      await auth.signIn();
      // The below code won't execute immediately due to the redirect
      // The user state will be set in the initialize method after redirect
    } catch (err: any) {
      console.error('Login error:', err);
      setError(`Failed to log in: ${err.message || 'Unknown error'}`);
      setIsRedirecting(false);
      setLoading(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    setLoading(true);
    setIsRedirecting(true);
    
    try {
      console.log("Starting logout in AuthContext...");
      // With redirect flow, this will navigate away from the page
      await auth.signOut();
      // The below code won't execute immediately due to the redirect
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(`Failed to log out: ${err.message || 'Unknown error'}`);
      setIsRedirecting(false);
      setLoading(false);
    }
  };

  // Auth context value
  const value = {
    user,
    loading: loading || isRedirecting,
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