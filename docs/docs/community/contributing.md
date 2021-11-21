---
sidebar_position: 3
---

# Contributing

How to help us help you :) Notifire is an Open Source project, we would love for you to contribute,
you can see here our guidelines, making sure our code base is [readable](https://en.wikipedia.org/wiki/Code_Reading).

- [Questions](#question)
- [Issues and Bugs](#issue)
- [Feature Requests](#feature)
- [Missing Provider](#provider)
- [Submission Guidelines](#submit)
- [Programming Languages for Contribution](#language)
- [Development Setup](#development)
- [Coding Rules](#rules)

Other than code contribution you can also help us with efforts.
- [Answer Discussions][github-discussions].
- Try our [providers][providers-list] and give feedback.
- Spread the word if you like what we are doing.


## <a name="question"></a> Got a Question or a Thought?

The best place to reach us about questions, problems, or thoughts is on our [GitHub Discussions][github-discussions] page. 
There you both find previous discussions were we already started talking about that, or you can create a new discussion, your very own discussion.

## <a name="issue"></a> Found a Bug?

While we do have Unit tests, and process to verify PR's bugs still exists, if you find a bug, you can help us by
[submitting an issue](#submit-issue) to our [GitHub Issues][github-issues]. Or you can
[submit a Pull Request](#submit-pr) with a fix.

## <a name="feature"></a> Missing a Feature?

If a feature is missing you can _request_ a new one by [submitting an issue](#submit-issue) to our GitHub
Repository. In the case you would like to _implement_ it, an issue with a proposal must be submitted first, to be sure that we can use it.
Please consider:

- **Small Feature** can be submitted directly to [submitted as a Pull Request](#submit-pr) after the implementation.
- **Major Feature** proposal needs to be discussed first, so open a discussion in our [GitHub Discussions][github-discussions].
  This will also allow us to prevent duplication of work, coordinate our efforts better, and ultimately build it so that it is successfully merged into the Notifire.


## <a name="provider"></a> Missing a Provider?

If a provider is missing you can _request_ a new one by [submitting an issue](#submit-issue) to our GitHub
Repository. Or you can build a new one, following our [create a provider](create-provider.md) article.

## <a name="submit"></a> Submission Guidelines

### <a name="submit-issue"></a> Submitting an Issue

Prior of a new issue submission, please search the [issues tab][github-issues], and [discussion tab][github-discussions] maybe an issue or discussion already exists and the discussion might inform you of workarounds, or you can give new information.

While we want to fix all the issues, before fixing a bug we need to be able to reproduce and confirm it. 
Please provide us with a minimal reproduction scenario using a repository or [Gist](https://gist.github.com/). Having a live, reproducible scenario gives us the information without asking questions back & forth with additional questions like:

- 3rd-party libraries and their versions, mainly providers, but not exclusively
- a use-case that fails

Without said minimal reproduction, we won't be able to investigate all issues, and the issue might not be resolved.

You can open a new issues with this [new issue form](https://github.com/notifirehq/notifire/issues/new).

### <a name="submit-pr"></a> Submitting a Pull Request (PR)

Before you submit your Pull Request (PR) consider the following guidelines:

1. Look in our [GitHub](https://github.com/notifirehq/notifire/pulls) for an open or closed PR
   that relates to your submission. You don't want to duplicate effort.
1. Fork notifirehq/notifire repo, or any of our providers.
1. Make your changes in a new git branch:

   ```shell
   git checkout -b my-new-branch master
   ```

1. Write your code, **including test cases**.
1. Follow our [Coding Rules](#rules).
1. Run the full test suit (see [common scripts](#common-scripts)),
   and ensure that all tests pass.
1. Commit your changes using a descriptive commit message that follows our
   [commit message conventions](#commit). Adherence to these conventions
   is necessary because release notes are automatically generated from these messages.

   ```shell
   git commit -a
   ```

   Note: the optional commit `-a` command line option will automatically "add" and "rm" edited files.

1. Push your branch to GitHub:

   ```shell
   git push origin my-new-branch
   ```

1. In GitHub, send a pull request to `notifire:master`.

- If we suggest changes then:

    - Make the required updates.
    - Re-run the test suite to ensure tests are still passing.
    - Rebase your branch and force push to your GitHub repository (this will update your Pull Request):

      ```shell
      git rebase master -i
      git push -f
      ```

That's it! You are amazing! Thank you for your contribution!

#### After your pull request is merged

After your pull request is merged, you can safely delete your branch and pull the changes
from the main (upstream) repository:

- Delete the remote branch on GitHub either through the GitHub web UI or your local shell as follows:

  ```shell
  git push origin --delete my-new-branch
  ```

- Check out the master branch:

  ```shell
  git checkout master -f
  ```

- Delete the local branch:

  ```shell
  git branch -D my-new-branch
  ```

- Update your master with the latest upstream version:

  ```shell
  git pull --ff upstream master
  ```
## <a name="language"></a> Programming Languages for Contribution

Our project primarily uses following programming languages:

- [Nodejs](https://nodejs.org/en/)
- [Typescript](https://www.typescriptlang.org/)
- [Javascript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

## <a name="development"></a> Development Setup

Will be added shortly.

### <a name="common-scripts"></a>Commonly used NPM scripts

Will be added shortly.

## <a name="rules"></a> Coding Rules

To ensure consistency throughout the source code, keep these rules in mind as you are working:

- All features or bug fixes **must be tested** by one or more specs (unit-tests).
- We use [Eslint default rule guide][js-style-guide], with minor changes. 
  An automated formatter is available (`npm run format`).

Documentation is inspired by [nestjs](https://github.com/nestjs/nest) and [supabase](https://github.com/supabase/supabase) 

[github-issues]: https://github.com/notifirehq/notifire/issues
[github-discussions]: https://github.com/notifirehq/notifire/discussions
[js-style-guide]: https://eslint.org/docs/rules/
[providers-list]: https://www.notifire.co/providers-list
