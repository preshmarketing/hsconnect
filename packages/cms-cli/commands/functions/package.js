const ora = require('ora');
const {
  addPortalOptions,
  addConfigOptions,
  setLogLevel,
  getPortalId,
  addUseEnvironmentOptions,
} = require('../../lib/commonOpts');
const { trackCommandUsage } = require('../../lib/usageTracking');
const { logDebugInfo } = require('../../lib/debugInfo');
const {
  loadConfig,
  validateConfig,
  checkAndWarnGitInclusion,
} = require('@hubspot/cms-lib');
const {
  logApiErrorInstance,
  ApiErrorContext,
} = require('@hubspot/cms-lib/errorHandlers');
const { logger } = require('@hubspot/cms-lib/logger');
const { buildPackage } = require('@hubspot/cms-lib/api/functions');
const { validatePortal } = require('../../lib/validation');

const makeSpinner = (functionPath, portalIdentifier) => {
  return ora(
    `Building new bundle for '${functionPath}' on portal '${portalIdentifier}'.\n`
  );
};

const loadAndValidateOptions = async options => {
  setLogLevel(options);
  logDebugInfo(options);
  const { config: configPath } = options;
  loadConfig(configPath, options);
  checkAndWarnGitInclusion();

  if (!(validateConfig() && (await validatePortal(options)))) {
    process.exit(1);
  }
};

exports.command = 'package <path>';
exports.describe = false;
// Uncomment to unhide 'builds a new dependency bundle for the specified .functions folder';

exports.handler = async options => {
  loadAndValidateOptions(options);

  const { path: functionPath } = options;
  const portalId = getPortalId(options);
  const spinner = makeSpinner(functionPath, portalId);

  trackCommandUsage('functions-package', { functionPath }, portalId);

  const splitFunctionPath = functionPath.split('.');

  if (
    !splitFunctionPath.length ||
    splitFunctionPath[splitFunctionPath.length - 1] !== 'functions'
  ) {
    logger.error(`Specified path ${functionPath} is not a .functions folder.`);
    return;
  }

  logger.debug(
    `Starting build for .functions folder with path: ${functionPath}`
  );

  spinner.start();
  try {
    await buildPackage(portalId, `${functionPath}/package.json`);
    spinner.stop();
    logger.success(
      `Successfully built bundle from package.json for ${functionPath} on portal ${portalId}.`
    );
  } catch (e) {
    spinner.stop();
    if (e.statusCode === 404) {
      logger.error(`Unable to find package.json for function ${functionPath}.`);
    } else {
      logApiErrorInstance(
        portalId,
        e,
        new ApiErrorContext({ portalId, functionPath })
      );
    }
  }
};

exports.builder = yargs => {
  yargs.positional('path', {
    describe: 'Path to .functions folder',
    type: 'string',
  });
  yargs.example([
    [
      '$0 functions package myFunctionFolder.functions',
      'Build a new bundle for all functions within the myFunctionFolder.functions folder',
    ],
  ]);

  addConfigOptions(yargs, true);
  addPortalOptions(yargs, true);
  addUseEnvironmentOptions(yargs, true);

  return yargs;
};