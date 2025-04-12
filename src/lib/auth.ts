import { PublicClientApplication, AuthenticationResult, AccountInfo, RedirectRequest, LogLevel } from '@azure/msal-browser';

export interface IUser {
  id: string;
  email: string;
  name: string;
  token: string;
}

// MSAL configuration for Azure AD
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/consumers/',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        if (!containsPii) {
          console.log(`MSAL - ${level}: ${message}`);
        }
      },
      logLevel: 3, // Verbose logging (0=Error, 1=Warning, 2=Info, 3=Verbose)
    }
  }
};

// Login request configuration
const loginRequest: RedirectRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

// For debugging
console.log("Auth module loaded with client ID:", import.meta.env.VITE_MICROSOFT_CLIENT_ID);

// MSAL Client instance
const msalInstance = new PublicClientApplication(msalConfig);

// Authentication service
export const auth = {
  // Initialize the auth client
  initialize: async (): Promise<void> => {
    try {
      await msalInstance.initialize();
      console.log("MSAL initialized successfully");
      
      // Handle the redirect promise on page load to catch redirect responses
      await msalInstance.handleRedirectPromise().then(response => {
        if (response) {
          console.log("Successfully handled redirect response", response.account?.username);
        } else {
          console.log("No redirect response to handle");
        }
      });
    } catch (error) {
      console.error('Error initializing MSAL:', error);
    }
  },

  // Sign in with Microsoft
  signIn: async (): Promise<IUser | null> => {
    try {
      console.log("Starting sign-in process with redirect flow...");
      // Using loginRedirect instead of loginPopup to avoid cross-origin issues
      await msalInstance.loginRedirect(loginRequest);
      
      // This code will not execute immediately as the page will redirect
      // The response will be handled in the initialize method after redirect
      return null;
    } catch (error) {
      console.error('Sign-in error:', error);
      throw error;
    }
  },

  // Sign out
  signOut: async (): Promise<void> => {
    try {
      const logoutRequest = {
        account: msalInstance.getActiveAccount() || undefined,
        postLogoutRedirectUri: window.location.origin,
      };
      
      // Use logoutRedirect to be consistent with the login flow
      await msalInstance.logoutRedirect(logoutRequest);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  },

  // Get current user if signed in
  getCurrentUser: async (): Promise<IUser | null> => {
    const accounts = msalInstance.getAllAccounts();
    
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
      
      try {
        const response = await msalInstance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0]
        });
        
        return transformAccountToUser(accounts[0], response.accessToken);
      } catch (error) {
        console.error('Error acquiring token silently:', error);
        return null;
      }
    }
    
    return null;
  },

  // Get access token for API calls
  getAccessToken: async (): Promise<string | null> => {
    const account = msalInstance.getActiveAccount();
    
    if (!account) {
      return null;
    }
    
    try {
      const response = await msalInstance.acquireTokenSilent({
        ...loginRequest,
        account
      });
      
      return response.accessToken;
    } catch (error) {
      console.error('Error acquiring token:', error);
      return null;
    }
  }
};

// Helper function to transform MSAL account to user
function transformAccountToUser(account: AccountInfo, token: string): IUser {
  return {
    id: account.localAccountId,
    email: account.username,
    name: account.name || account.username,
    token: token
  };
}

export default auth;