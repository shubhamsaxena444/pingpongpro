// Microsoft Authentication configuration

// Log environment variables being loaded (for debugging)
console.log("Environment variable check:", {
  clientIdPresent: !!import.meta.env.VITE_MICROSOFT_CLIENT_ID,
  clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID
});

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID, // Remove the fallback to force errors if not defined
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

