const core = require('@actions/core');
const github = require('@actions/github');

const { createGithubConnection } = require('./lib/github');
const { handleCopy, handleUpdate, handleClose } = require('./lib/issue');

async function run() {
  try {
    const targetRepoOwner = core.getInput('targetRepoOwner', {
      required: true,
    });
    const targetRepoName = core.getInput('targetRepoName', { required: true });
    const targetRepoAuthToken = core.getInput('targetRepoAuthToken', {
      required: true,
    });
    const targetRepoBaseUrl = core.getInput('targetRepoBaseUrl');

    const octokit = createGithubConnection(
      targetRepoAuthToken,
      targetRepoBaseUrl
    );

    const action = github.context.payload.action;

    switch (action) {
      case 'opened':
        await handleCopy(octokit);
        break;
      case 'updated':
        await handleUpdate(octokit);
        break;
      case 'closed':
        await handleClose(octokit);
        break;
      default:
        core.setFailed('Unsupported issue action type', action);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
