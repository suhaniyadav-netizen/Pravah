/**
 * Pravah — Express Server Entrypoint for Vercel & Node
 */
const app = require('./src/app');

// In local non-Vercel environments, allow running directly via `node index.js`
if (require.main === module && !process.env.VERCEL) {
  require('./src/main');
}

module.exports = app;
