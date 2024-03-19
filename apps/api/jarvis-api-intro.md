Hi, I'm Jarvis 🤖

I'm a bot built to help you with your contribution to Novu. 
I will add instructions and guides on how to run the subset of the Novu platform associated to this issue and make your first contribution.

This issue was tagged as related to `@novu/api` and the related code is located at the `apps/api` folder, here is how I can help you:

<details>
  <summary>First time contributing to Novu?</summary>

  If that's the first time you want to contribute to Novu here are a few simple steps to get you started:
  1. Fork the repository and clone your fork to your local machine.
  2. Install the dependencies using `npm run setup:project`.
  3. Create a new branch with the number of the issue, for example: `1454-fix-something-cool` and start contributing based on the [Contributing Guide](https://docs.novu.co/community/run-in-local-machine?utm_campaign=github-jarvis) or the short guide in the section below.
  4. Create a Pull request and follow the template of creation 
</details>

<details>
  <summary>Run and test `@novu/api` locally</summary>

  ### Run API in watch mode
  The easiest way to start the API is to run `npm run start:api` from the root of the repository

  ### Run API integration tests
  To validate your changes or simply to run the e2e tests run `npm run start:e2e:api`. All the e2e tests have the `.e2e.ts` suffix and usually are located near the controller files of each module.
</details>
