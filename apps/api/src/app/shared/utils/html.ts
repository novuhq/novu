export const removeBrandingFromHtml = (html: string): string => {
  try {
    return html.replace(/<table[^>]*data-novu-branding[^>]*>[\s\S]*?<\/table>(\s*)/gi, '');
  } catch (error) {
    return html;
  }
};
