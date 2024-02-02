const { execSync } = require('child_process');
const { get } = require('axios');
const core = require('@actions/core');

/*
 * Get the hash link of the submodule from the root directory of the project
 */
function getSubmoduleHash(): string {
  try {
    return execSync('git submodule status --recursive', { cwd: __dirname + '/../../' })
      .toString()
      .trim()
      .split(' ')[0];
  } catch (error) {
    throw new Error('Error occurred while extracting submodule hash:' + error.message);
  }
}

/*
 * Fetch the commits from the submodule repository
 */
async function fetchCommits(branch: string) {
  const owner = 'novuhq';
  const repo = 'packages-enterprise';

  try {
    const { data: commits } = await get(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      },
    });

    return commits;
  } catch (error) {
    throw new Error('Error occurred while fetching commits:' + error.message);
  }
}

function getLastCommitHash(commits) {
  // skip the merge commits we want to check only the commits that were made on the branch
  const branchCommits = commits.filter((entity) => !entity?.commit?.message.startsWith('Merge pull request'));

  return branchCommits[0].sha;
}

/*
 * If the new tag or PR was created, skip the validation.
 * This serves as an additional guard; however, this validation should be performed within the action.
 */
function shouldSkip(githubRef: string) {
  return !githubRef.includes('refs/heads/');
}

async function validateSubmoduleSync(githubRef: string) {
  if (shouldSkip(githubRef)) {
    // return true;
  }

  // const branch = githubRef.replace('refs/heads/', '');
  const branch = 'next';

  const submoduleHash = getSubmoduleHash();
  const commits = await fetchCommits(branch);
  const lastSubmoduleCommitHash = getLastCommitHash(commits);

  const isValid = submoduleHash === lastSubmoduleCommitHash;

  // Set the output parameters
  core.setOutput('submoduleHash', submoduleHash);
  core.setOutput('lastCommitHash', lastSubmoduleCommitHash);

  return isValid;
}

(async function execute() {
  try {
    const isValid = await validateSubmoduleSync(process.argv[2]);

    process.exit(isValid ? 0 : 1);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
