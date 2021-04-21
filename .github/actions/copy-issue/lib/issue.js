const github = require('@actions/github');
const core = require('@actions/core');

async function findIssue(octokit, title) {
  const issues = await octokit.issues.list();
  const matchingIssues = issues.find(issue => issue.title === title);
  // Only return a value if we are able to find exactly one matching issue
  return matchingIssues.length === 1 ? matchingIssues[0] : null;
}

async function handleCopy(octokit, repoData) {
  // Context from github action
  const { html_url, title } = github.context.payload.issue;

  if (!!html_url && !!title) {
    const res = await octokit.issues.create({
      ...repoData,
      title,
      body: html_url,
    });
    core.setOutput('Created:', res.data.html_url);
  } else {
    core.setFailed('Invalid context provided for copy');
  }
}

async function handleUpdate(octokit, repoData) {
  // Context from github action
  const { title } = github.context.payload.issue;

  if (!!title) {
    const matchingIssue = await findIssue(octokit, title);

    if (matchingIssue) {
      const res = await octokit.issues.update({
        ...repoData,
        title,
      });
      core.setOutput('Updated:', res.data.html_url);
    } else {
      core.setFailed('Unable to find issue to update');
    }
  } else {
    core.setFailed('Invalid context provided for update');
  }
}

async function handleClose(octokit, repoData) {
  // Context from github action
  const { title } = github.context.payload.issue;

  if (!!title) {
    const matchingIssue = await findIssue(octokit, title);

    if (matchingIssue) {
      const res = await octokit.issues.createComment({
        ...repoData,
        issue_number: matchingIssue.number,
        body: 'Original issue is now closed',
      });
      core.setOutput('Added closed comment:', res.data.html_url);
    } else {
      core.setFailed('Unable to find issue to update');
    }
  } else {
    core.setFailed('Invalid context provided for close');
  }
}

module.exports = { handleCopy, handleUpdate, handleClose };
