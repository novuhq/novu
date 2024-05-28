/** Get the innermost <html> element that serves as the basis for our theme */
export const getColorSchemeHtmlElement = (): HTMLHtmlElement | null => {
  /**
   * Avoid issues with multiple `html` elements (like in Storybook) by getting all html elements
   * and taking the innermost one
   */
  const htmlElements = document.querySelectorAll('html');

  if (!htmlElements?.length) {
    return null;
  }

  return htmlElements.item(htmlElements.length - 1);
};
