// Central configuration file for environment variables
// This handles environment variables in both development and production

// Check for runtime environment variables (available during runtime in Azure)
declare global {
  interface Window {
    // Define a global window property that might be injected by Azure Static Web Apps
    ENV_VARS?: {
      VITE_COSMOS_DB_CONNECTION_STRING?: string;
      VITE_COSMOS_DB_DATABASE_NAME?: string;
      VITE_COSMOS_DB_CONTAINER_NAME?: string;
      VITE_MICROSOFT_CLIENT_ID?: string;
      VITE_MICROSOFT_CLIENT_SECRET?: string;
    };
  }
}

// Helper function to get the correct env variable from various sources
function getEnvVar(key: string): string {
  // Check environment sources in order of priority
  
  // 1. First check window.ENV_VARS (for runtime injection)
  if (window.ENV_VARS && window.ENV_VARS[key as keyof typeof window.ENV_VARS]) {
    console.log(`Using runtime injected variable for ${key}`);
    return window.ENV_VARS[key as keyof typeof window.ENV_VARS] || '';
  }
  
  // 2. Check Vite's import.meta.env
  if ((import.meta.env as any)[key]) {
    console.log(`Using Vite import.meta.env for ${key}`);
    return (import.meta.env as any)[key] || '';
  }

  // 3. Check for process.env (in case of special Vite plugins)
  if (typeof process !== 'undefined' && process.env && (process.env as any)[key]) {
    console.log(`Using process.env for ${key}`);
    return (process.env as any)[key] || '';
  }

  // 4. For local development/testing, could add fallbacks here if needed
  console.warn(`Environment variable ${key} not found in any source`);
  return '';
}

// Export all configuration values
export const config = {
  cosmos: {
    connectionString: getEnvVar('VITE_COSMOS_DB_CONNECTION_STRING'),
    databaseName: getEnvVar('VITE_COSMOS_DB_DATABASE_NAME') || 'pingpongpro',
    containerName: getEnvVar('VITE_COSMOS_DB_CONTAINER_NAME') || 'profile',
  },
  microsoft: {
    clientId: getEnvVar('VITE_MICROSOFT_CLIENT_ID'),
    clientSecret: getEnvVar('VITE_MICROSOFT_CLIENT_SECRET'),
  }
};

// Log config status (but not the actual values for security)
console.log('Configuration status:', {
  cosmos: {
    connectionStringPresent: !!config.cosmos.connectionString,
    databaseName: config.cosmos.databaseName,
    containerName: config.cosmos.containerName,
  },
  microsoft: {
    clientIdPresent: !!config.microsoft.clientId,
    clientSecretPresent: !!config.microsoft.clientSecret,
  }
});

export default config;