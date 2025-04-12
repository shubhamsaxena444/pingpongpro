import { CosmosClient, Database, Container } from '@azure/cosmos';

// Define interfaces for our data models
export interface IProfile {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  matches_played?: number;
  matches_won?: number;
  created_at?: string;
  updated_at?: string;
}

export interface IMatch {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  winner_id: string;
  created_by?: string;
  played_at: string;
}

// Cosmos DB configuration
interface CosmosDBConfig {
  connectionString: string;
  databaseId: string;
  containersConfig: {
    profiles: { id: string; partitionKey: string };
    matches: { id: string; partitionKey: string };
  };
}

export interface CosmosDBClient {
  database: Database;
  containers: {
    profiles: Container;
    matches: Container;
  };
}

// Singleton pattern for Cosmos DB client
let cosmosDBInstance: CosmosDBClient | null = null;

// Parse connection string for environment variables
const parseConnectionString = (connString: string) => {
  try {
    // Extract the account endpoint
    const endpointMatch = connString.match(/AccountEndpoint=([^;]+)/);
    let endpoint = endpointMatch ? endpointMatch[1] : '';
    
    // Replace the actual endpoint with our proxy endpoint when in development
    if (import.meta.env.DEV && endpoint) {
      // Extract the hostname from the endpoint
      const originalUrl = new URL(endpoint);
      // Use the proxy path instead
      endpoint = `${window.location.origin}/cosmos-api`;
      console.log(`Development mode: Replacing Cosmos DB endpoint with proxy: ${endpoint}`);
    }
    
    // Extract the account key
    const keyMatch = connString.match(/AccountKey=([^;]+)/);
    const key = keyMatch ? keyMatch[1] : '';
    
    return { endpoint, key };
  } catch (error) {
    console.error('Error parsing connection string:', error);
    return { endpoint: '', key: '' };
  }
};

// Configuration object with environment variables
const connectionString = import.meta.env.VITE_COSMOS_DB_CONNECTION_STRING || '';
const { endpoint, key } = parseConnectionString(connectionString);

const cosmosConfig: CosmosDBConfig = {
  connectionString: connectionString,
  databaseId: import.meta.env.VITE_COSMOS_DB_DATABASE_NAME || 'pingpongpro',
  containersConfig: {
    profiles: {
      id: import.meta.env.VITE_COSMOS_DB_CONTAINER_NAME || 'profile',
      partitionKey: '/id'
    },
    matches: {
      id: 'matches',
      partitionKey: '/id'
    }
  }
};

// Initialize Cosmos DB client and containers
export const initializeCosmosDB = async (): Promise<CosmosDBClient> => {
  if (!connectionString || !endpoint || !key) {
    throw new Error('Azure Cosmos DB credentials are not configured properly. Check your environment variables.');
  }

  // Create the Cosmos client with our endpoint (which may be proxied in development)
  const client = new CosmosClient({
    endpoint,
    key
  });

  // Get (or create) the database
  const { database } = await client.databases.createIfNotExists({
    id: cosmosConfig.databaseId
  });

  // Get (or create) the containers
  const { container: profilesContainer } = await database.containers.createIfNotExists({
    id: cosmosConfig.containersConfig.profiles.id,
    partitionKey: {
      paths: [cosmosConfig.containersConfig.profiles.partitionKey]
    }
  });

  const { container: matchesContainer } = await database.containers.createIfNotExists({
    id: cosmosConfig.containersConfig.matches.id,
    partitionKey: {
      paths: [cosmosConfig.containersConfig.matches.partitionKey]
    }
  });

  return {
    database,
    containers: {
      profiles: profilesContainer,
      matches: matchesContainer
    }
  };
};

// Singleton getter function for Cosmos DB client
export const getCosmosDB = async (): Promise<CosmosDBClient> => {
  if (!cosmosDBInstance) {
    cosmosDBInstance = await initializeCosmosDB();
  }
  return cosmosDBInstance;
};

// Create a shortcut for easier imports
export const cosmos = {
  getClient: getCosmosDB
};

export default cosmos;