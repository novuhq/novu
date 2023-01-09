<br/>
<br/>

<div align="center">
  <a href="https://novu.co" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/8872447/165779319-34962ccc-3149-466c-b1da-97fd93254520.png">
    <img src="https://user-images.githubusercontent.com/8872447/165779274-22a190da-3284-487e-bd1e-14983df12cbb.png" width="280" alt="Logo"/>
  </picture>
  </a>
</div>

<h1 align="center">Novu + Next.js 13 Template</h1>

<div align="center">
Template to get started with integrating Novu with Next.js
</div>

  <p align="center">
    <br />
    <a href="https://docs.novu.co" rel="dofollow"><strong>Explore the docs »</strong></a>
    <br />
  </p>

## 🚀 Project setup

To get started, you'll need to do the following:

### Create a Notification Template

1. Create your account on [Novu](https://novu.co)
2. Head to [Templates](https://web.novu.co/templates) and create a new Notification Template.
3. Fill out the required details.
4. In the workflow editor, add an "In-App" step to your workflow. You may customize the In-App template to your liking.
5. Leave everything else as is and click "Create".
6. Take note of your **Trigger ID**, you'll need this for the suceeding steps.

### Setup the Next.js project

> Note: This assumes that you already have a copy of the project on your local machine. If not, you can either clone the
> repository or download the zip file.

1. Install dependencies by running the following command in the root directory of this project:

```base
npm install
```

2. Create a `.env` by copying the `.env.example` file, this will contain the environment variables that is needed to
   configure the Novu packages. You may use the command below:

```bash
cp .env.example .env
```

3. Fill out the environment variables in the `.env` file. You may refer to the table below for the description of each
   variable.

```bash
# Novu API Keys from Dashboard > Settings > API Keys
NOVU_API_KEY=
NOVU_APP_ID=

# Trigger ID based on the template you created
NOVU_TEST_TRIGGER_ID=

# Subscriber ID, set this to any value that you want
NOVU_SUBSCRIBER_ID=my-subscriber
```

4. Run the development server:

```bash
npm run dev
```

Your Novu web app should now be running locally on your machine! If you encounter any issues setting up the project,
please don't hesitate to open and issue.

## Learn More

To learn more about Novu, take a look at the following resources:

- [Novu Documentation](https://docs.novu.co/) - learn about Novu features and API.
- [Projects and Articles Showcase](https://docs.novu.co/community/projects-and-articles) - learn about how other
  developers are using Novu.

You can check out [the Novu GitHub repository](https://github.com/novuhq/novu) - your feedback and contributions are
welcome!
