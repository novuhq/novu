const SUPPORTED_LANGUAGES = ['es-ES', 'fr-FR', 'ja-JP'];

export function isLanguageSupported(language: string) {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return false;
  }

  return true;
}
