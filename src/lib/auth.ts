import { PublicClientApplication, AuthenticationResult, AccountInfo } from '@azure/msal-browser';

export interface IUser {
  id: string;
  email: string;
  name: string;
  token: string;
}

// MSAL configuration for Azure AD
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  }
};

// Login request configuration
const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email']
};

// MSAL Client instance
const msalInstance = new PublicClientApplication(msalConfig);

// Authentication service
export const auth = {
  // Initialize the auth client
  initialize: async (): Promise<void> => {
    await msalInstance.initialize();
    msalInstance.handleRedirectPromise().catch(error => {
      console.error('Error handling redirect:', error);
    });
  },

  // Sign in with Microsoft
  signIn: async (): Promise<IUser | null> => {
    try {
      const response: AuthenticationResult = await msalInstance.loginPopup(loginRequest);
      
      if (response && response.account) {
        return transformAccountToUser(response.account, response.accessToken);
      }
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
      
      await msalInstance.logoutPopup(logoutRequest);
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