#!/usr/bin/env python3
"""Fix provider/API SEO metadata after bulk update."""

from __future__ import annotations

import re
from pathlib import Path

DOCS_ROOT = Path(__file__).resolve().parents[1]
API_ROOT = DOCS_ROOT / "api-reference"
INTEGRATIONS_ROOT = DOCS_ROOT / "platform" / "integrations"

CHANNEL_LABELS = {
    "email": "email",
    "sms": "SMS",
    "push": "push",
    "chat": "chat",
}

CHANNEL_ARTICLE = {
    "email": "an email",
    "sms": "an SMS",
    "push": "a push",
    "chat": "a chat",
}


def parse_frontmatter(content: str) -> tuple[dict[str, str], str]:
    if not content.startswith("---"):
        return {}, content

    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content

    fields: dict[str, str] = {}
    for line in parts[1].strip().splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip().strip("\"'")

    return fields, parts[2]


def render_frontmatter(fields: dict[str, str]) -> str:
    order = ["title", "sidebarTitle", "description", "openapi"]
    lines: list[str] = []

    for key in order:
        if key in fields and fields[key]:
            value = fields[key]
            if " " in value or ":" in value:
                lines.append(f'{key}: "{value}"')
            else:
                lines.append(f"{key}: '{value}'")

    for key, value in fields.items():
        if key in order or not value:
            continue
        if " " in value or ":" in value:
            lines.append(f'{key}: "{value}"')
        else:
            lines.append(f"{key}: '{value}'")

    return "---\n" + "\n".join(lines) + "\n---"


def provider_name(fields: dict[str, str]) -> str:
    if fields.get("sidebarTitle"):
        return fields["sidebarTitle"]

    title = fields.get("title", "")
    title = re.sub(r"\s+(Email|SMS|Push|Chat) Integration with Novu$", "", title, flags=re.I)
    return title.strip()


def provider_title(name: str, channel: str) -> str:
    if channel == "email":
        return f"{name} Email Integration with Novu"
    if channel == "sms":
        return f"{name} SMS Integration with Novu"
    if channel == "push":
        return f"{name} Push Integration with Novu"

    return f"{name} Chat Integration with Novu"


def provider_description(name: str, channel: str) -> str:
    label = CHANNEL_LABELS[channel]
    return (
        f"Connect {name} to Novu to send {label} notifications through notification workflows. "
        f"Step-by-step credential setup."
    )


def provider_lead(name: str, channel: str) -> str:
    label = CHANNEL_LABELS[channel]
    article = CHANNEL_ARTICLE[channel]
    return (
        f"To send {label} notifications through Novu using {name}, "
        f"add your {name} credentials as {article} integration in the Novu Dashboard."
    )


def title_to_intro(title: str) -> str:
    lower = title.lower()
    if lower.endswith(" schema"):
        resource = title.replace(" schema", "").strip()
        return f"Reference schema for the Novu {resource.lower()} object used in API requests and responses."
    if lower.startswith("create "):
        return f"Create {title[7:].lower()} in Novu using this REST API endpoint."
    if lower.startswith("update "):
        return f"Update {title[7:].lower()} in Novu using this REST API endpoint."
    if lower.startswith("delete "):
        return f"Delete {title[7:].lower()} in Novu using this REST API endpoint."
    if lower.startswith("retrieve "):
        return f"Retrieve {title[9:].lower()} from Novu using this REST API endpoint."
    if lower.startswith("list "):
        return f"List {title[5:].lower()} from Novu using this REST API endpoint."
    if lower == "trigger event":
        return (
            "Trigger a Novu notification workflow by sending an event with the workflow identifier, "
            "subscriber ID, and payload. Returns a transactionId for tracking."
        )

    return f"Call this Novu REST API endpoint to {lower}."


def clean_duplicate_leads(body: str, lead: str) -> str:
    paragraphs = [p.strip() for p in body.strip().split("\n\n") if p.strip()]
    cleaned: list[str] = []
    seen_leads: set[str] = set()

    for paragraph in paragraphs:
        if paragraph.startswith("To send ") and "through Novu using" in paragraph:
            if lead in seen_leads:
                continue
            seen_leads.add(paragraph)
            if paragraph != lead:
                continue

        cleaned.append(paragraph)

    if lead not in seen_leads:
        cleaned.insert(0, lead)

    return "\n\n".join(cleaned) + "\n"


def fix_provider(path: Path, channel: str) -> bool:
    content = path.read_text(encoding="utf-8")
    fields, body = parse_frontmatter(content)
    name = provider_name(fields)
    if not name:
        return False

    new_fields = dict(fields)
    new_fields["title"] = provider_title(name, channel)
    if name != new_fields["title"]:
        new_fields["sidebarTitle"] = name
    new_fields["description"] = provider_description(name, channel)

    lead = provider_lead(name, channel)
    new_body = clean_duplicate_leads(body, lead)

    new_content = render_frontmatter(new_fields) + "\n\n" + new_body
    if new_content != content:
        path.write_text(new_content, encoding="utf-8")
        return True

    return False


def fix_api(path: Path) -> bool:
    content = path.read_text(encoding="utf-8")
    fields, body = parse_frontmatter(content)
    if "openapi" not in fields:
        return False

    title = fields.get("title", "")
    intro = title_to_intro(title)
    body_stripped = body.strip()

    if not body_stripped:
        new_body = intro + "\n"
        path.write_text(render_frontmatter(fields) + "\n\n" + new_body, encoding="utf-8")
        return True

    if not body_stripped.startswith(intro.split(".")[0][:30]):
        if intro not in body_stripped:
            new_body = intro + "\n\n" + body_stripped + "\n"
            path.write_text(render_frontmatter(fields) + "\n\n" + new_body, encoding="utf-8")
            return True

    return False


def main() -> None:
    skip_names = {
        "adding-email.mdx",
        "adding-sms.mdx",
        "adding-chat.mdx",
        "demo-integration.mdx",
        "trigger-overrides.mdx",
        "activity-tracking.mdx",
        "writing-email-template.mdx",
        "push-activity-tracking.mdx",
        "push-webhook.mdx",
        "webhook.mdx",
    }

    provider_count = 0
    api_count = 0

    for channel in CHANNEL_LABELS:
        channel_dir = INTEGRATIONS_ROOT / channel
        if not channel_dir.exists():
            continue
        for path in sorted(channel_dir.rglob("*.mdx")):
            if path.name in skip_names or "activity-tracking" in str(path):
                continue
            if path.parent.name == "manual-configuration":
                continue
            if fix_provider(path, channel):
                provider_count += 1

    for path in sorted(API_ROOT.rglob("*.mdx")):
        if fix_api(path):
            api_count += 1

    print(f"Fixed {provider_count} provider pages and {api_count} API pages.")


if __name__ == "__main__":
    main()
