#!/usr/bin/env python3
"""Fix duplicate content between Step titles and descriptions in MDX docs."""

from __future__ import annotations

import re
from pathlib import Path

STEP_PATTERN = re.compile(r'(<Step title="([^"]+)">)\s*(.*?)\s*(</Step>)', re.DOTALL)

RICH_CONTENT_PATTERN = re.compile(
    r'!\[|<Note|<Warning|<Tip|<Info|<Check|```|^\s*[-*]\s|<Tabs|<Frame|<CodeGroup|<Accordion|<Card|<Prompt',
    re.MULTILINE,
)

CLICK_ONLY_PATTERN = re.compile(r'^Click \*\*[^*]+\*\*\.$', re.IGNORECASE)

TITLE_REPLACEMENTS: dict[str, str] = {
    "Go to the Novu Dashboard": "Sign in at the [Novu Dashboard](https://dashboard.novu.co).",
    "Navigate to Workflows": "Open **Workflows** from the left sidebar.",
    "Log in to the Novu dashboard": "Open the [Novu Dashboard](https://dashboard.novu.co).",
    "Log in to Expo": "Sign in at the [Expo console](https://expo.dev/).",
    "Log in to Pusher Beams": "Open the Pusher Beams dashboard and sign in.",
    "Log in to Pushpad": "Open your Pushpad dashboard and sign in.",
    "Log in to Azure Portal": "Sign in at the [Azure Portal](https://portal.azure.com/).",
    "Go to the Workflows page": "Open the [Workflows page](https://dashboard.novu.co/workflows) in the Novu dashboard.",
    "Go to the Agents page": "In the Novu dashboard, open the [Agents page](https://dashboard.novu.co/agents).",
    "Open the Slack API dashboard": "Go to the [Slack API dashboard](https://api.slack.com/apps).",
    "Open Integration Store": "In the Novu dashboard sidebar, click **Integration Store**.",
    "Open Integrations Store": "In the Novu dashboard sidebar, click **Integrations Store**.",
    "Select a template": "Browse the template library and pick one that matches your use case.",
    "Find the workflow": "Locate the workflow on the **Workflows** page.",
    "Select Duplicate workflow": "",
    "Select Delete": "",
    "Confirm deletion": "Review the warning, then confirm to permanently delete the workflow.",
    "Create the workflow": "Review the form, then click **Create workflow**.",
    "Create agent": "Enter a name and description, then click **Create agent**.",
    "Connect a provider": "In the **Integration Store**, click **Connect provider** to begin setup.",
    "Create the integration": "Review your credentials, then click **Create Integration** to save.",
    "Create an instance": "Name your Pusher Beams instance, then click **Create instance**.",
    "Send invitation": "The invited user appears under **Invitations** until they accept.",
    "Accept or decline": "Approved users are added with the **Viewer** role by default.",
    "Find the member": "Use search or scroll the member list to locate them.",
    "Select a new role": "Choose from the [available account roles](/platform/account/roles-and-permissions).",
    "Click Invite": "You can invite from the **Members**, **Invitations**, or **Requests** tab.",
    "Open Requests tab": "Pending join requests from verified domains appear here.",
    "Enter the email domain": "Use your organization's domain (for example, `novu.co`).",
    "Add a domain": "",
    "Save the domain": "",
    "Remove the member": "This immediately revokes their access and signs them out.",
    "Restart Claude Desktop": "Quit and reopen Claude Desktop to load the new MCP configuration.",
    "Select the Endpoints tab": "In the Novu dashboard, open **Settings** > **Webhooks**, then select **Endpoints**.",
    "Add an endpoint": "On the **Webhooks** page, click **Add Endpoint**.",
    "Create the endpoint": "Review the configuration, then click **Create**.",
    "Enter a description": "Add a label that helps you identify this connector later.",
    "Create the destination table": "Create a table with columns for the webhook fields you want to store.",
    "Grant insert permissions": "Ensure the database user Novu connects with can insert rows into the destination table.",
    "Add the connector endpoint": "In Novu, add the connector endpoint and fill in connection settings (URL, credentials, database, and table).",
    "Define the table schema": "Map Novu payload fields to your destination table columns.",
    "Write the transformation": "Map Novu payloads into your table schema. Start from the dashboard template and adjust as needed.",
    "Create a ClickHouse table": "Define columns for the webhook event fields you want to store.",
    "Create a Snowflake table": "Define columns for the webhook event fields you want to store.",
    "Create a Redshift table": "Define columns for the webhook event fields you want to store.",
    "Create an IAM user": "Grant only the permissions this connector needs.",
    "Create an SQS queue": "Use this queue as the destination for Novu webhook events.",
    "Create an SNS topic": "Use this topic as the destination for Novu webhook events.",
    "Fill in connection settings": "Enter credentials, define the table schema, and review the transformation.",
    "Add a description": "Summarize what this app registration is used for.",
    "Add redirect URI": "Paste the redirect URI from your Novu integration settings.",
    "Configure": "Complete the remaining required fields in the configuration form.",
    "Add a permission": "Search for and add the required Microsoft Graph permission.",
    "Save the workflow": "Publish your changes so the Teams workflow can receive events.",
    "Set expiry date": "Choose an expiration that aligns with your credential rotation policy.",
    "Select Application permissions": "Switch from delegated to application permissions.",
    "Choose a trigger": "For example, select **When a Teams webhook request is received**.",
    "Create an app": "In Slack, click **Create an App** to start a new app registration.",
    "Select From scratch": "Choose **From scratch** and enter an app name and workspace.",
    "Novu exchanges the code": "Novu stores the Slack access token for the connected workspace.",
    "User selects a channel": "The subscriber picks a Slack channel where notifications should be delivered.",
    "Find Slack endpoints": "Novu looks up Slack endpoints that match the subscriber ID and context.",
    "Deliver messages": "Novu sends the notification to each configured Slack destination.",
    "Approve authorization": "The subscriber approves access for your Slack app.",
    "Trigger the workflow": "Send a test trigger for a subscriber who has connected Telegram.",
    "Add Telegram as a provider": "Novu creates the integration and links it to your agent automatically.",
    "Select Expo Push": "In the **Push** tab, choose **Expo Push** from the provider list.",
    "Select OneSignal": "In the **Push** tab, choose **OneSignal** from the provider list.",
    "Select Push Webhook": "In the **Push** tab, choose **Push Webhook** from the provider list.",
    "Select Pusher Beams": "In the **Push** tab, choose **Pusher Beams** from the provider list.",
    "Select Pushpad": "In the **Push** tab, choose **Pushpad** from the provider list.",
    "Add access token": "Generate a token in Pushpad and paste it into the integration form.",
    "Save changes": "Your updates apply immediately to future workflow triggers.",
    "Open Authentication": "In the app registration sidebar, open **Authentication (Preview)**.",
    "Open API permissions": "In the app registration sidebar, click **API permissions**.",
    "Confirm permissions": "Grant admin consent if your tenant requires it.",
    "Start creation": "Begin creating a new Azure Bot resource.",
    "Review and create": "Validate the configuration, then proceed to deployment.",
    "Create the bot": "Wait for Azure to finish provisioning the bot resource.",
    "Open Settings": "In the Azure Bot resource, open **Settings**.",
    "Open Channels": "Under settings, open the **Channels** pane.",
    "Apply changes": "Save the channel configuration before leaving the page.",
    "Save the app": "Save your Teams app manifest changes in the Developer Portal.",
    "Open Contexts": "In the Novu dashboard sidebar, click **Contexts**.",
    "Modify the data object": "Edit the JSON payload for this context in the editor.",
    "Agent encounters a tool call": "Novu prompts the user to authorize the tool before continuing.",
    "Novu receives the event": "The provider delivers the inbound message to your agent endpoint.",
    "Novu delivers the reply": "The agent response is posted back to the original provider thread.",
    "Novu maps the thread": "Novu resolves the conversation and subscriber from the provider metadata.",
    "Novu calls onMessage": "Your agent handler receives the message context and generates a reply.",
    "Novu posts the reply": "The reply is sent to the provider thread the user is messaging from.",
    "User messages the agent": "The user sends a message from a connected provider such as Slack.",
    "Fill in workflow details": "",
}


def normalize(text: str) -> str:
    t = re.sub(r'!\[[^\]]*\]\([^)]*\)', '', text)
    t = re.sub(
        r'<(Note|Warning|Tip|Info|Check|Frame|Tabs|Tab|Card|Accordion|AccordionGroup|CodeGroup|Snippet|Prompt|Columns|CardGroup)[^>]*>.*?</\1>',
        '',
        t,
        flags=re.DOTALL,
    )
    t = re.sub(r'<[^>]+>', '', t)
    t = re.sub(r'\*\*([^*]+)\*\*', r'\1', t)
    t = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', t)
    t = re.sub(r'[`"]', '', t)
    t = re.sub(r'\s+', ' ', t).strip().rstrip('.\\').lower()
    return t


def normalize_title(title: str) -> str:
    t = re.sub(r'\*\*([^*]+)\*\*', r'\1', title)
    t = re.sub(r'\([^)]*\)', '', t)
    t = re.sub(r'\s+', ' ', t).strip().rstrip('.').lower()
    return t


def title_words(title: str) -> set[str]:
    t = normalize_title(title)
    stop = {'a', 'an', 'the', 'to', 'in', 'on', 'your', 'and', 'or', 'for', 'of', 'via', 'with'}
    return {w for w in re.findall(r'\w+', t) if w not in stop and len(w) > 1}


def body_words(body: str) -> set[str]:
    first_line = body.strip().split('\n')[0]
    b = normalize(first_line)
    b = re.sub(r'^click ', '', b)
    stop = {'a', 'an', 'the', 'to', 'in', 'on', 'your', 'and', 'or', 'for', 'of', 'via', 'with'}
    return {w for w in re.findall(r'\w+', b) if w not in stop and len(w) > 1}


def has_rich_content(text: str) -> bool:
    return bool(RICH_CONTENT_PATTERN.search(text))


def is_duplicate(title: str, body: str) -> bool:
    nt = normalize_title(title)
    nb = normalize(body)
    if not nb:
        return False
    if nb == nt:
        return True
    if nb.startswith(nt + ' ') or nb.startswith(nt + ':'):
        return True
    if len(nb) < 100 and nt in nb and len(nb) - len(nt) < 30:
        return True
    return False


def is_semantic_duplicate(title: str, body: str) -> bool:
    if has_rich_content(body):
        return False

    lines = [line.strip() for line in body.strip().split('\n') if line.strip()]
    if len(lines) != 1:
        return False

    first_line = lines[0]
    if len(first_line) > 120:
        return False

    if is_duplicate(title, body):
        return True

    tw = title_words(title)
    bw = body_words(body)
    if not tw:
        return False

    overlap = len(tw & bw) / len(tw)
    extra_words = bw - tw
    if overlap >= 0.75 and len(extra_words) <= 2:
        return True

    if CLICK_ONLY_PATTERN.match(first_line) and overlap >= 0.4:
        return True

    nf = normalize(first_line)
    nt = normalize_title(title)
    if nf.startswith('click ') and nt.replace('open ', '').replace('select ', '') in nf:
        return True

    return False


def strip_duplicate_prefix(title: str, body: str) -> str | None:
    lines = body.split('\n')
    first_line = lines[0].strip()

    if not first_line:
        return None

    nt = normalize_title(title)
    nf = normalize(first_line)

    if nf == nt or nf.startswith(nt + ' ') or nf.startswith(nt + ':'):
        remaining = '\n'.join(lines[1:]).strip()
        return remaining

    click_match = re.match(r'^Click \*\*([^*]+)\*\*\.\s*(.*)$', first_line, re.IGNORECASE)
    if click_match:
        action = normalize(click_match.group(1))
        rest = click_match.group(2).strip()
        if action in nt or nt in action or len(title_words(title) & body_words(first_line)) / max(len(title_words(title)), 1) >= 0.5:
            if rest:
                return rest + ('\n' + '\n'.join(lines[1:]).strip() if len(lines) > 1 else '')
            remaining = '\n'.join(lines[1:]).strip()
            return remaining

    return None


def fix_step(title: str, body: str) -> str | None:
    if not is_semantic_duplicate(title, body):
        return None

    stripped = strip_duplicate_prefix(title, body)
    if stripped is not None:
        if stripped:
            return stripped
        if title in TITLE_REPLACEMENTS:
            return TITLE_REPLACEMENTS[title]
        return ""

    if title in TITLE_REPLACEMENTS:
        return TITLE_REPLACEMENTS[title]

    first_line = body.strip().split('\n')[0].strip()
    if CLICK_ONLY_PATTERN.match(first_line):
        return ""

    return ""


def process_file(path: Path) -> int:
    content = path.read_text(encoding='utf-8')
    changes = 0

    def replacer(match: re.Match[str]) -> str:
        nonlocal changes
        open_tag = match.group(1)
        title = match.group(2)
        body = match.group(3)
        close_tag = match.group(4)

        new_body = fix_step(title, body.strip())
        if new_body is None:
            return match.group(0)

        changes += 1
        if new_body:
            return f"{open_tag}\n    {new_body}\n  {close_tag}"

        return f"{open_tag}\n  {close_tag}"

    new_content = STEP_PATTERN.sub(replacer, content)
    if changes:
        path.write_text(new_content, encoding='utf-8')

    return changes


def main() -> None:
    docs_root = Path(__file__).resolve().parents[1]
    total = 0
    files_changed = 0

    for path in sorted(docs_root.rglob('*.mdx')):
        count = process_file(path)
        if count:
            files_changed += 1
            total += count
            print(f"{path.relative_to(docs_root)}: {count}")

    print(f"\nUpdated {total} steps across {files_changed} files.")


if __name__ == '__main__':
    main()
