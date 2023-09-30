const { Octokit } = require('@octokit/action');

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const getCurrentMilestone = async (owner, repo) => {
  const { data } = await octokit.rest.issues.listMilestones({
    owner,
    repo,
    state: 'open',
  });
  console.log(JSON.stringify(data, null, 2));

  return data[0];
};

const start = async () => {
  const payload = require(process.env.GITHUB_EVENT_PATH);
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  const { number } = payload?.issue || payload?.pull_request;
  console.log(`Running for ${number}`);
  const currentMilestone = await getCurrentMilestone(owner, repo);

  console.log(JSON.stringify(currentMilestone, null, 2));

  await octokit.rest.issues.update({
    owner,
    repo,
    issue_number: number,
    milestone: currentMilestone?.number || null,
  });
};

start();
