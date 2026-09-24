/**
 * Pravah V2 - Server Entrypoint
 * Phase 2
 */

const http = require('http');
const app = require('./app');
const { initSocketServer } = require('./config/socket');

const PORT = parseInt(process.env.PORT || '5000', 10);

const server = http.createServer(app);
const io = initSocketServer(server);

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Pravah V2 Server running on port ${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   Auth API:     http://localhost:${PORT}/api/auth`);
  console.log(`   Realtime IO:  Active with JWT & room authorization`);
  console.log(`   Environment:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});

// Graceful shutdown handling
function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  // Force close after 5 seconds if graceful shutdown hangs
  const forceExitTimer = setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);

  server.close(() => {
    clearTimeout(forceExitTimer);
    console.log('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = server;
