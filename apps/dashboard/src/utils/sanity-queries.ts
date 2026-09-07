// GROQ queries for Sanity content, kept as plain template strings (mirroring the Sanity source of
// truth) so we don't pull in a `groq`-tag dependency.

const imageFields = `
  "url": asset->url + "?auto=format",
  "width": asset->metadata.dimensions.width,
  "height": asset->metadata.dimensions.height,
  "alt": alt
`;

const templateCategoryFields = `
  "id": slug.current,
  title,
  description
`;

const templateReferenceFields = `
  "id": slug.current,
  name,
  description
`;

const templateChannelFields = `
  ${templateReferenceFields},
  "isComingSoon": isComingSoon == true,
  "icon": icon {
    ${imageFields}
  }
`;

const templateIconReferenceFields = `
  ${templateReferenceFields},
  "icon": icon {
    ${imageFields}
  }
`;

const templateMcpServerFields = `
  ${templateIconReferenceFields},
  url
`;

const templateAvatarFields = `
  "id": slug.current,
  name,
  "darkImage": darkImage {
    ${imageFields}
  },
  "lightImage": lightImage {
    ${imageFields}
  }
`;

const agentTemplateFields = `
  _id,
  _createdAt,
  "id": id.current,
  name,
  agentName,
  summary,
  avatar->{
    ${templateAvatarFields}
  },
  category->{
    ${templateCategoryFields}
  },
  mcpServerList[]->{
    ${templateMcpServerFields}
  },
  channels[]->{
    ${templateChannelFields}
  },
  "skillsList": skillsList[]{
    "value": select(defined(_ref) => @->slug.current, @)
  }.value,
  "tools": coalesce(tools[]->{
    ${templateReferenceFields}
  }, []),
  systemPrompt
`;

export const agentTemplatesQuery = `
  *[_type == "agentTemplate"] | order(category->orderRank asc, name asc) {
    ${agentTemplateFields}
  }
`;
