import('./backend/server.js').catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
