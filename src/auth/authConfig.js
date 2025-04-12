// Microsoft Authentication configuration
import { config } from '../lib/config';

// Log environment variables being loaded (for debugging)
console.log("Microsoft Auth configuration status:", {
  clientIdPresent: !!config.microsoft.clientId
});

const msalConfig = {
  auth: {
    clientId: config.microsoft.clientId,
    authority: "https://login.microsoftonline.com/consumers/", // Changed to consumers for personal Microsoft accounts
    redirectUri: window.location.origin, // Should match the redirect URI in Azure AD app registration
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: true, // Set to true for IE 11 compatibility
  }
};

// Add the scopes here for the resources you want to access
const loginRequest = {
  scopes: ["User.Read", "openid", "profile", "email"]
};

export { msalConfig, loginRequest };

