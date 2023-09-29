# DEPTs fork of novu

## Why?

We forked novu to implement some features to better suit our needs:
#### `Slack-dm integration` 
 Implement another slack integration since the original one wasn't suited to send direct messages to individual users.
#### `Workflow filters` 
 Added two filters to the workfows:
  - `Is office hours` - Takes into consideration the users' timezone taken from slack.
  - `Is online on slack` - Uses slacks 'getPresence'
