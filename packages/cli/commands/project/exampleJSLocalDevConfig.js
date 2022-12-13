const express = require('express');
const { logger } = require('@hubspot/cli-lib/logger');

// Return true if we can't handle this change locally and
// want to trigger a project upload
const handleFileChange = filePath => {
  logger.log(`handling ${filePath} change for js component`);
  return { uploadRequired: false };
};

const handleCleanup = () => {
  logger.log('Cleaning up for js component');
};

const setupApp = () => {
  const app = express();

  app.use((req, res, next) => {
    logger.log('Custom middleware for js component');
    next();
  });

  // Initialize a base route
  app.get('/test', (req, res) => {
    res.send('Custom js component handling here');
  });

  return app;
};

module.exports = { handleFileChange, handleCleanup, setupApp };
