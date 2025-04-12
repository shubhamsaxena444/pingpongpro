// This file injects environment variables into the window object at runtime
// Azure Static Web Apps uses a different format for injecting variables

window.ENV_VARS = {
  // The format is {{ CONNECTION_STRING }} - this is used by Azure Static Web Apps
  VITE_COSMOS_DB_CONNECTION_STRING: "{{ VITE_COSMOS_DB_CONNECTION_STRING }}",
  VITE_COSMOS_DB_DATABASE_NAME: "{{ VITE_COSMOS_DB_DATABASE_NAME }}",
  VITE_COSMOS_DB_CONTAINER_NAME: "{{ VITE_COSMOS_DB_CONTAINER_NAME }}",
  VITE_MICROSOFT_CLIENT_ID: "{{ VITE_MICROSOFT_CLIENT_ID }}",
  VITE_MICROSOFT_CLIENT_SECRET: "{{ VITE_MICROSOFT_CLIENT_SECRET }}"
};