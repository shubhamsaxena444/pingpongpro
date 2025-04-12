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
      VITE_AZURE_OPENAI_API_KEY?: string;
      VITE_AZURE_OPENAI_ENDPOINT?: string;
      VITE_AZURE_OPENAI_MODEL_NAME?: string;
      VITE_AZURE_OPENAI_API_VERSION?: string;
    };
  }
}

// Helper function to get the correct env variable from various sources
function getEnvVar(key: string): string {
  // For debugging - log all sources
  console.log(`Trying to get env var: ${key}`, {
    windowEnvVarsExists: !!window.ENV_VARS,
    windowEnvVarValue: window.ENV_VARS?.[key as keyof typeof window.ENV_VARS],
    viteEnvValue: (import.meta.env as any)[key],
    processEnvExists: typeof process !== 'undefined' && !!process.env
  });

  // Check environment sources in order of priority
  
  // 1. First check window.ENV_VARS (for runtime injection)
  if (window.ENV_VARS && window.ENV_VARS[key as keyof typeof window.ENV_VARS]) {
    const value = window.ENV_VARS[key as keyof typeof window.ENV_VARS];
    // Check if the value is a placeholder that wasn't replaced
    if (value && !value.includes('{{') && !value.includes('}}')) {
      console.log(`Using runtime injected variable for ${key}`);
      return value || '';
    } else {
      console.warn(`Found placeholder for ${key} that wasn't replaced by Azure Static Web Apps`);
    }
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

  // 4. Hardcoded fallbacks for development/testing
  if (key === 'VITE_COSMOS_DB_DATABASE_NAME') return 'pingpongpro';
  if (key === 'VITE_COSMOS_DB_CONTAINER_NAME') return 'profile';

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
  },
  azureOpenai: {
    apiKey: getEnvVar('VITE_AZURE_OPENAI_API_KEY'),
    endpoint: getEnvVar('VITE_AZURE_OPENAI_ENDPOINT'),
    modelName: getEnvVar('VITE_AZURE_OPENAI_MODEL_NAME'),
    apiVersion: getEnvVar('VITE_AZURE_OPENAI_API_VERSION') || '2023-05-15',
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
  },
  azureOpenai: {
    apiKeyPresent: !!config.azureOpenai.apiKey,
    endpointPresent: !!config.azureOpenai.endpoint,
    modelNamePresent: !!config.azureOpenai.modelName,
    apiVersion: config.azureOpenai.apiVersion
  }
});

export default config;