const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const chokidar = require('chokidar');
const chalk = require('chalk');
const {
  addAccountOptions,
  addConfigOptions,
  getAccountId,
  addUseEnvironmentOptions,
  addTestingOptions,
} = require('../../lib/commonOpts');
const { getAccountConfig } = require('@hubspot/cli-lib');
const { trackCommandUsage } = require('../../lib/usageTracking');
const { loadAndValidateOptions } = require('../../lib/validation');
const { i18n } = require('@hubspot/cli-lib/lib/lang');
const { logger } = require('@hubspot/cli-lib/logger');
const {
  ensureProjectExists,
  getProjectConfig,
  handleProjectUpload,
  validateProjectConfig,
} = require('../../lib/projects');
const { uiInfoSection, uiLine } = require('../../lib/ui');
const { EXIT_CODES } = require('../../lib/enums/exitCodes');
const { handleKeypress, handleExit } = require('@hubspot/cli-lib/lib/process');

const i18nKey = 'cli.commands.project.subcommands.dev';

exports.command = 'dev [path]';
exports.describe = i18n(`${i18nKey}.describe`);

const localDevConfig = {
  privateApp: {
    baseRoute: 'app',
    package: './exampleAppLocalDevConfig',
  },
  js: {
    baseRoute: 'js',
    package: './exampleJSLocalDevConfig', //TODO @hubspot/cms-dev-server
  },
};

//TODO actually implement something that checks which components a project contains?
const projectContainsApp = true;
const projectContainsJSRendering = true;

const loadComponentHandlers = () => {
  Object.keys(localDevConfig).forEach(componentType => {
    const localDevConfigForComponent = localDevConfig[componentType];
    //NOTE this is where we could decide not to load/initialize certain local dev configs depending
    // on what components exist in the project.
    if (
      (localDevConfigForComponent.baseRoute === 'app' && projectContainsApp) ||
      (localDevConfigForComponent.baseRoute === 'js' &&
        projectContainsJSRendering)
    ) {
      const handlers = require(localDevConfigForComponent.package);
      localDevConfig[componentType].handlers = handlers;
    } else {
      localDevConfig[componentType].handlers = {};
    }
  });
};

const passFileChangeToComponentHandlers = filePath => {
  let uploadRequired = false;

  Object.keys(localDevConfig).forEach(componentType => {
    const { baseRoute, handlers } = localDevConfig[componentType];
    //TODO If we already know that we need to upload, should we still call
    // handle file change for every component?
    if (handlers.handleFileChange) {
      const uploadRequiredForThisComponent = handlers.handleFileChange(
        filePath
      );
      if (!uploadRequired && uploadRequiredForThisComponent) {
        logger.log(`${baseRoute} component is telling us to upload`);
        uploadRequired = true;
      }
    }
  });

  return uploadRequired;
};

exports.handler = async options => {
  await loadAndValidateOptions(options);

  const accountId = getAccountId(options);
  const { path, port } = options;

  trackCommandUsage('project-dev', null, accountId);

  const accountConfig = getAccountConfig(accountId);

  //TODO require that the user runs this against a sandbox account?
  if (!accountConfig.sandboxType) {
    logger.warn(
      'This command should be run on a sandbox account (allowing it for now)'
    );
    logger.log();
    // process.exit(EXIT_CODES.ERROR);
  }

  const { projectConfig, projectDir } = await getProjectConfig(path);
  validateProjectConfig(projectConfig, projectDir);

  // NOTE setting forceCreate to true here to bypass prompt
  await ensureProjectExists(accountId, projectConfig.name, {
    forceCreate: true,
  });

  loadComponentHandlers();

  let currentServer;
  let watcher;
  let serverReady = false;
  let watchReady = false;

  const startServer = () => {
    const app = express();

    // Install Middleware
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
    app.use(cors());

    // Configure
    app.set('trust proxy', true);

    // Initialize a base route
    app.get('/', (req, res) => {
      res.send('HubSpot local dev server');
    });

    // Setup dedicated local dev routes for each component type
    Object.keys(localDevConfig).forEach(componentType => {
      const { baseRoute, handlers } = localDevConfig[componentType];

      if (handlers.setupApp) {
        app.use(`/${baseRoute}`, handlers.setupApp());
      }
    });

    // Start server
    currentServer = app.listen(port, () => {
      serverReady = true;
      return logReadyMessage();
    });
  };

  const startWatch = () => {
    watcher = chokidar.watch(projectDir, { ignoreInitial: true });

    watcher.on('ready', () => {
      watchReady = true;
      logReadyMessage();
    });

    watcher.on('all', async (type, filePath) => {
      logger.log(`${type} detected in ${filePath}`);

      await watcher.close();

      currentServer.close(async () => {
        const uploadRequired = passFileChangeToComponentHandlers(filePath);

        if (uploadRequired) {
          logger.log('Cannot handle change locally, uploading changes');
          await handleProjectUpload(
            accountId,
            projectConfig,
            projectDir,
            start
          );
        } else {
          logger.log('Change handled locally');
          start();
        }
      });
    });
  };

  const onTerminate = () => {
    // Custom clean up handling for components
    Object.keys(localDevConfig).forEach(componentType => {
      const { handleCleanup } = localDevConfig[componentType].handlers;

      if (handleCleanup) {
        handleCleanup();
      }
    });

    logger.log(i18n(`${i18nKey}.logs.processExited`));
    process.exit(EXIT_CODES.SUCCESS);
  };

  const logReadyMessage = () => {
    if (serverReady && watchReady) {
      const testServerPath = `http://localhost:${port}`;

      logger.log();
      uiLine();
      logger.log(`Project test server running at ${testServerPath}`);
      logger.log(`Watcher is ready and watching ${projectDir} for changes`);
      logger.log(`> Press ${chalk.bold('q')} to quit dev mode`);
    }
  };

  const start = () => {
    serverReady = false;
    watchReady = false;
    startServer();
    startWatch();

    handleExit(onTerminate);
    handleKeypress(key => {
      if ((key.ctrl && key.name === 'c') || key.name === 'q') {
        onTerminate();
      }
    });
  };

  uiInfoSection('HubSpot Project Local Dev Mode', () => {
    logger.log(
      `Project ${projectConfig.name} is now set up for local development.`
    );
    logger.log();

    Object.keys(localDevConfig).forEach(componentType => {
      const { baseRoute, handlers } = localDevConfig[componentType];

      if (Object.keys(handlers).length) {
        logger.log(`- Initialized local dev for ${baseRoute} component`);
      }
    });
  });

  start();
};

exports.builder = yargs => {
  addConfigOptions(yargs, true);
  addAccountOptions(yargs, true);
  addUseEnvironmentOptions(yargs, true);
  addTestingOptions(yargs, true);

  yargs.positional('path', {
    describe: i18n(`${i18nKey}.positionals.path.describe`),
    type: 'string',
  });
  yargs.options({
    port: {
      describe: i18n(`${i18nKey}.options.port.describe`),
      type: 'number',
      default: 8080,
    },
  });

  yargs.example([['$0 project dev', i18n(`${i18nKey}.examples.default`)]]);

  return yargs;
};
