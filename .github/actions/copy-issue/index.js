const core = require('@actions/core');
const github = require('@actions/github');
const {
  enterpriseServer220Admin,
} = require('@octokit/plugin-enterprise-server');

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

    let octokit;

    if (targetRepoBaseUrl) {
      const OctokitEnterprise220 = GitHub.plugin(enterpriseServer220Admin);
      octokit = new OctokitEnterprise220({
        auth: targetRepoAuthToken,
        baseUrl: targetRepoBaseUrl,
      });
    } else {
      octokit = github.getOctokit(targetRepoAuthToken);
    }

    // Context from github action
    const { html_url, title } = github.context.issue;

    //TODO handle updates/deletes?
    // delete - keep copied issue, but comment "original issue deleted"
    // update - handle updates to the title only, everything else can be ignored

    const res = await octokit.issues.create({
      owner: targetRepoOwner,
      repo: targetRepoName,
      title,
      body: html_url,
    });

    core.setOutput('created', [res.id, res.number].join(':'));
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
