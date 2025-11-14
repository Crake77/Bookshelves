// Load environment variables from .env.local before any other modules
// This is a CommonJS file so it can be used with --require
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

