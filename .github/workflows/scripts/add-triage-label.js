const { Octokit } = require('@octokit/action');
const { isCommunityContributor } = require('./is-community-contributor');

const octokit = new Octokit();

const getAuthor = (payload) => {
  return payload?.issue?.user?.login || payload?.pull_request?.user?.login || null;
};

async function start() {
  const payload = require(process.env.GITHUB_EVENT_PATH);
  if (payload?.pull_request) {
    console.log('Skipping pull request execution');
    return;
  }

  const username = getAuthor(payload);
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  const { number } = payload?.issue || payload?.pull_request;

  const isCommunityUser = await isCommunityContributor(owner, repo, username);
  console.log('::set-output name=is-community::%s', isCommunityUser ? 'yes' : 'no');

  if (isCommunityUser) {
    await addLabel('triage', owner, repo, number);
  }
}

const addLabel = async (label, owner, repo, issueNumber) => {
  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels: [label],
  });
};

start();
