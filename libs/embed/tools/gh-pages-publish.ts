const { cd, exec, echo, touch } = require('shelljs');
const { readFileSync } = require('fs');
const url = require('url');

let repoUrl;
const pkg = JSON.parse(readFileSync('package.json') as any);
if (typeof pkg.repository === 'object') {
  if (!pkg.repository.hasOwnProperty('url')) {
    throw new Error('URL does not exist in repository section');
  }
  repoUrl = pkg.repository.url;
} else {
  repoUrl = pkg.repository;
}

const parsedUrl = url.parse(repoUrl);
const repository = (parsedUrl.host || '') + (parsedUrl.path || '');
const ghToken = process.env.GH_TOKEN;

echo('Deploying docs!!!');
cd('docs');
touch('.nojekyll');
exec('git init');
exec('git add .');
exec('git config user.name "Dima Grossman"');
exec('git config user.email "dima@grossman.io"');
exec('git commit -m "docs(docs): update gh-pages"');
exec(`git push --force --quiet "https://${ghToken}@${repository}" master:gh-pages`);
echo('Docs deployed!!');
