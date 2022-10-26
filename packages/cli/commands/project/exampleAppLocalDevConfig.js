const express = require('express');
const { logger } = require('@hubspot/cli-lib/logger');

// Return true if we can't handle this change locally and
// want to trigger a project upload
const handleFileChange = filePath => {
  logger.log(`handling ${filePath} change for app component`);
  return true;
};

const handleCleanup = () => {
  logger.log('Cleaning up for app component');
};

const setupApp = () => {
  const app = express();

  app.use((req, res, next) => {
    logger.log('Custom middleware for app component');
    next();
  });

  // Initialize a base route
  app.get('/test', (req, res) => {
    res.send('Custom app component handling here');
  });

  return app;
};

module.exports = { handleFileChange, handleCleanup, setupApp };
