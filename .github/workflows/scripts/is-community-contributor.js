const { Octokit } = require('@octokit/action');

const octokit = new Octokit();

const isCommunityContributor = async (owner, repo, username) => {
  if (!username) return false;

  const {
    data: { permission },
  } = await octokit.rest.repos.getCollaboratorPermissionLevel({
    owner,
    repo,
    username,
  });

  return permission === 'read' || permission === 'none';
};

module.exports = {
  isCommunityContributor,
};
