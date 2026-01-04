/** Get the innermost <html> element that serves as the basis for our theme */
export const getColorSchemeHtmlElement = (): HTMLHtmlElement | null => {
  const htmlElements = document.querySelectorAll('html');

  if (!htmlElements?.length) {
    return null;
  }

  return htmlElements.item(htmlElements.length - 1);
};
