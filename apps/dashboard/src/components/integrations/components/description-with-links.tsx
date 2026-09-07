type Link = {
  text: string;
  url: string;
};

type DescriptionWithLinksProps = {
  description: string;
  links?: Link[];
};

/**
 * DescriptionWithLinks Component
 *
 * Renders a description text with specific words/phrases converted to clickable links.
 * Uses a functional approach to replace text segments with link elements.
 *
 * @param description - The original text description that may contain linkable text
 * @param links - Optional array of link objects containing text to find and URLs to link to
 *
 * @returns JSX element with text and embedded links, or plain text if no links provided
 *
 * @example
 * <DescriptionWithLinks
 *   description="Visit our docs and support page for help"
 *   links={[
 *     { text: "docs", url: "https://docs.example.com" },
 *     { text: "support page", url: "https://support.example.com" }
 *   ]}
 * />
 */
export function DescriptionWithLinks({ description, links }: DescriptionWithLinksProps) {
  if (!links || links.length === 0) {
    return <span>{description}</span>;
  }

  // Filter and sort valid links by their position in the description
  const validLinks = links
    .map((link) => ({ ...link, position: description.indexOf(link.text) }))
    .filter((link) => link.position !== -1)
    .sort((a, b) => a.position - b.position);

  if (validLinks.length === 0) {
    return <span>{description}</span>;
  }

  return <span>{processTextWithLinks(description, validLinks)}</span>;
}

/**
 * Recursively processes text and converts specified segments to links
 *
 * @param text - Current text segment to process
 * @param remainingLinks - Links that haven't been processed yet
 * @param keyPrefix - Prefix for React keys to ensure uniqueness
 *
 * @returns Array of text strings and link elements
 */
function processTextWithLinks(
  text: string,
  remainingLinks: Array<Link & { position: number }>,
  keyPrefix: string = 'link'
): (string | React.ReactElement)[] {
  if (remainingLinks.length === 0 || !text) {
    return text ? [text] : [];
  }

  const [firstLink, ...restLinks] = remainingLinks;
  const linkPosition = text.indexOf(firstLink.text);

  if (linkPosition === -1) {
    // Link not found in current text, process remaining links
    return processTextWithLinks(text, restLinks, keyPrefix);
  }

  const beforeLink = text.slice(0, linkPosition);
  const afterLink = text.slice(linkPosition + firstLink.text.length);

  // Update positions for remaining links since we're working with a substring
  const updatedRestLinks = restLinks
    .map((link) => ({
      ...link,
      position: link.position - (linkPosition + firstLink.text.length),
    }))
    .filter((link) => link.position >= 0);

  return [
    ...(beforeLink ? [beforeLink] : []),
    <a
      key={`${keyPrefix}-${linkPosition}`}
      href={firstLink.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-800"
    >
      {firstLink.text}
    </a>,
    ...processTextWithLinks(afterLink, updatedRestLinks, `${keyPrefix}-${linkPosition}`),
  ];
}
