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
  endpoint: string;
  key: string;
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

// Configuration object with environment variables
const cosmosConfig: CosmosDBConfig = {
  endpoint: import.meta.env.VITE_AZURE_COSMOS_ENDPOINT || '',
  key: import.meta.env.VITE_AZURE_COSMOS_KEY || '',
  databaseId: import.meta.env.VITE_AZURE_COSMOS_DATABASE || 'pingpong-db',
  containersConfig: {
    profiles: {
      id: 'profiles',
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
  if (!cosmosConfig.endpoint || !cosmosConfig.key) {
    throw new Error('Azure Cosmos DB credentials are not configured properly. Check your environment variables.');
  }

  // Create the Cosmos client
  const client = new CosmosClient({
    endpoint: cosmosConfig.endpoint,
    key: cosmosConfig.key
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