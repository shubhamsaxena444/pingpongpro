// Microsoft Authentication configuration

const msalConfig = {
  auth: {
    clientId: process.env.MICROSOFT_PROVIDER_AUTHENTICATION_ID || 'your-client-id-here', // This should match your Azure AD app registration
    authority: "https://login.microsoftonline.com/common", // Common endpoint for multi-tenant applications
    redirectUri: window.location.origin, // Should match the redirect URI in Azure AD app registration
  },
  cache: {
    cacheLocation: "sessionStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set to true for IE 11 compatibility
  }
};

// Add the scopes here for the resources you want to access
const loginRequest = {
  scopes: ["User.Read"]
};

export { msalConfig, loginRequest };
