const { execSync } = require('child_process');
const https = require('https');

/*
 * Get the hash link of the submodule from the root directory of the project
 */
function getSubmoduleHash() {
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
async function fetchCommits(branch) {
  const owner = 'novuhq';
  const repo = 'packages-enterprise';

  const options = {
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/commits?sha=${branch}`,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'User-Agent': '@novuhq/validate-submodule-sync-action',
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const commits = JSON.parse(data);
          resolve(commits);
        } catch (error) {
          reject(new Error('Error parsing response data'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error('Error occurred while fetching commits: ' + error.message));
    });

    req.end();
  });
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
function shouldSkip(githubRef) {
  return !githubRef.includes('refs/heads/');
}

async function validateSubmoduleSync(githubRef) {
  if (shouldSkip(githubRef)) {
    // return true;
  }

  // const branch = githubRef.replace('refs/heads/', '');
  const branch = 'next';

  const submoduleHash = getSubmoduleHash();
  const commits = await fetchCommits(branch);
  const lastSubmoduleCommitHash = getLastCommitHash(commits);

  return submoduleHash === lastSubmoduleCommitHash;
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
