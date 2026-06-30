#!/usr/bin/env python3
"""Bulk SEO updates for API endpoint and provider documentation pages."""

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


def parse_frontmatter(content: str) -> tuple[dict[str, str], str, str]:
    if not content.startswith("---"):
        return {}, content, content

    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content, content

    frontmatter_raw = parts[1].strip()
    body = parts[2]
    fields: dict[str, str] = {}

    for line in frontmatter_raw.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip().strip("\"'")

    return fields, frontmatter_raw, body


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


def title_to_description(title: str) -> str:
    lower = title.lower()
    if lower.endswith(" schema"):
        resource = title.replace(" schema", "").replace("Schema", "").strip()
        return (
            f"Reference the Novu {resource.lower()} schema used in API requests and responses. "
            f"Review fields, data types, and object structure for this resource."
        )

    return f"{title} using the Novu REST API. Requires your environment secret key in the Authorization header."


def title_to_intro(title: str) -> str:
    lower = title.lower()

    if lower.endswith(" schema"):
        resource = title.replace(" schema", "").strip()
        return f"Reference schema for the Novu {resource.lower()} object used in API requests and responses."

    if lower.startswith("create "):
        resource = title[7:]
        return f"Create {resource.lower()} in Novu using this REST API endpoint."

    if lower.startswith("update "):
        resource = title[7:]
        return f"Update {resource.lower()} in Novu using this REST API endpoint."

    if lower.startswith("delete "):
        resource = title[7:]
        return f"Delete {resource.lower()} in Novu using this REST API endpoint."

    if lower.startswith("retrieve ") or lower.startswith("get "):
        resource = title.split(" ", 1)[1]
        return f"Retrieve {resource.lower()} from Novu using this REST API endpoint."

    if lower.startswith("list "):
        resource = title[5:]
        return f"List {resource.lower()} from Novu using this REST API endpoint."

    if lower.startswith("trigger"):
        return "Trigger a Novu notification workflow by sending an event with the workflow identifier, subscriber ID, and payload."

    if "bulk" in lower:
        return f"{title} in Novu using this REST API endpoint."

    return f"Call this Novu REST API endpoint to {lower}."


def update_api_file(path: Path) -> bool:
    content = path.read_text(encoding="utf-8")
    fields, _, body = parse_frontmatter(content)

    if "openapi" not in fields:
        return False

    title = fields.get("title", path.stem.replace("-", " ").title())
    changed = False

    if "description" not in fields:
        fields["description"] = title_to_description(title)
        changed = True

    intro = title_to_intro(title)
    body_stripped = body.lstrip("\n")

    if body_stripped and not body_stripped.startswith(intro):
        if not body_stripped.startswith("Use this endpoint") and not body_stripped.startswith("Trigger a Novu"):
            body = f"\n\n{intro}\n\n{body_stripped}"
            if not body.startswith("\n"):
                body = "\n" + body
            changed = True

    if not changed:
        return False

    path.write_text(render_frontmatter(fields) + body, encoding="utf-8")
    return True


def provider_display_title(raw_title: str, channel: str) -> str:
    if "integration with novu" in raw_title.lower():
        return raw_title

    if channel == "email":
        return f"{raw_title} Email Integration with Novu"
    if channel == "sms":
        return f"{raw_title} SMS Integration with Novu"
    if channel == "push":
        return f"{raw_title} Push Integration with Novu"

    return f"{raw_title} Chat Integration with Novu"


def update_provider_file(path: Path, channel: str) -> bool:
    content = path.read_text(encoding="utf-8")
    fields, _, body = parse_frontmatter(content)
    raw_title = fields.get("title", path.stem.replace("-", " ").title())
    changed = False

    new_title = provider_display_title(raw_title, channel)
    if fields.get("title") != new_title:
        if "sidebarTitle" not in fields and raw_title != new_title:
            fields["sidebarTitle"] = raw_title
        fields["title"] = new_title
        changed = True

    channel_label = CHANNEL_LABELS[channel]
    article = CHANNEL_ARTICLE[channel]
    new_description = (
        f"Connect {raw_title} to Novu to send {channel_label} notifications through notification workflows. "
        f"Step-by-step credential setup."
    )

    if fields.get("description") != new_description:
        fields["description"] = new_description
        changed = True

    lead = (
        f"To send {channel_label} notifications through Novu using {raw_title}, "
        f"add your {raw_title} credentials as {article} integration in the Novu Dashboard."
    )
    body_stripped = body.lstrip("\n")

    if body_stripped and not body_stripped.startswith(lead):
        body = f"\n\n{lead}\n\n{body_stripped}"
        changed = True

    if not changed:
        return False

    path.write_text(render_frontmatter(fields) + body, encoding="utf-8")
    return True


def main() -> None:
    api_updated = 0
    provider_updated = 0

    for path in sorted(API_ROOT.rglob("*.mdx")):
        if update_api_file(path):
            api_updated += 1
            print(f"API: {path.relative_to(DOCS_ROOT)}")

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

    for channel in CHANNEL_LABELS:
        channel_dir = INTEGRATIONS_ROOT / channel
        if not channel_dir.exists():
            continue

        for path in sorted(channel_dir.rglob("*.mdx")):
            if path.name in skip_names or "activity-tracking" in str(path):
                continue
            if path.parent.name == "manual-configuration":
                continue
            if update_provider_file(path, channel):
                provider_updated += 1
                print(f"Provider: {path.relative_to(DOCS_ROOT)}")

    print(f"\nUpdated {api_updated} API pages and {provider_updated} provider pages.")


if __name__ == "__main__":
    main()
