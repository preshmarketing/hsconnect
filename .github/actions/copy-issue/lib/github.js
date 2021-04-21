const github = require('@actions/github');
const {
  enterpriseServer220Admin,
} = require('@octokit/plugin-enterprise-server');

function createGithubConnection(token, repoBaseUrl) {
  if (repoBaseUrl) {
    const OctokitEnterprise220 = GitHub.plugin(enterpriseServer220Admin);
    return new OctokitEnterprise220({
      auth: token,
      baseUrl: repoBaseUrl,
    });
  } else {
    return github.getOctokit(token);
  }
}

module.exports = { createGithubConnection };
