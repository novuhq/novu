# Novu Bridge App

This is a [Novu](https://novu.co/) bridge application bootstrapped with [`create-novu-app`](https://www.npmjs.com/package/create-novu-app)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

By default, the [Next.js](https://nextjs.org/) server will start in parallel with [localtunnel](https://github.com/localtunnel/localtunnel) and your workflow definition can be synchronized with Novu Cloud via the provided endpoint. Your server will by default run on [http://localhost:4000](http://localhost:4000).

## Your local tunnel

If you need to use a different tunneling solution you are free to do so. Adjust the `tunnel` script in your `package.json` in order to get your own tunnel going. Alternatively, if you don't want to manage the tunnel in this project, simply run the development server without the tunnel:

```bash
npm run next-dev
# or
yarn next-dev
# or
pnpm next-dev
# or
bun next-dev
```

## Your first workflow

Your first email workflow can be edited in `./app/novu/workflows.ts`. You can adjust your workflow to your liking.

## Learn More

To learn more about Novu, take a look at the following resources:

- [Novu](https://novu.co/)

You can check out [Novu GitHub repository](https://github.com/novuhq/novu) - your feedback and contributions are welcome!
