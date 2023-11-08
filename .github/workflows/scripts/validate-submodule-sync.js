const { Octokit: octokit } = require('@octokit/rest');
const { execSync } = require('child_process');

const octokitClient = new octokit({ auth: process.env.GITHUB_TOKEN });

(async function validateSubmoduleSync() {
  const githubRef = process.argv[2];

  // return true - skip the test if new tag or pr was created
  if (!githubRef.includes('refs/heads/')) {
    return true;
  }

  const branch = githubRef.replace('refs/heads/', '');

  const submodulePath = 'enterprise';
  const submoduleHash = execSync(`git ls-tree HEAD ${submodulePath} | cut -d" " -f3 | cut -f1`).toString().trim();

  const { data: commits } = await octokitClient.rest.repos.listCommits({
    owner: 'novuhq',
    repo: 'packages-enterprise',
    sha: branch,
  });

  // skip the merge commits we want to check only the commits that were made on the branch
  const branchCommits = commits.filter((entity) => !entity?.commit?.message.startsWith('Merge pull request'));
  const lastCommitHash = branchCommits[0].sha;

  const isValid = submoduleHash === lastCommitHash;

  process.exit(isValid ? 0 : 1);
})().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);

  process.exit(1);
});
