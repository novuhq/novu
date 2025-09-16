# Novu Translations CLI

The Novu CLI provides commands to manage translations for your Novu workspace.

## Commands

### `novu translations pull`

Downloads all translation files from Novu Cloud to your local directory.

```bash
# Pull translations to default directory (./translations)
npx novu translations pull -s YOUR_SECRET_KEY

# Pull to custom directory
npx novu translations pull -s YOUR_SECRET_KEY -d ./my-translations

# Use EU API endpoint
npx novu translations pull -s YOUR_SECRET_KEY -a https://eu.api.novu.co
```

**Options:**
- `-s, --secret-key <key>` - Your Novu Secret Key (required)
- `-a, --api-url <url>` - Novu API URL (default: https://api.novu.co)
- `-d, --directory <path>` - Directory to save files (default: ./translations)

### `novu translations push`

Uploads translation files from your local directory to Novu Cloud.

```bash
# Push translations from default directory (./translations)
npx novu translations push -s YOUR_SECRET_KEY

# Push from custom directory
npx novu translations push -s YOUR_SECRET_KEY -d ./my-translations

# Use EU API endpoint
npx novu translations push -s YOUR_SECRET_KEY -a https://eu.api.novu.co
```

**Options:**
- `-s, --secret-key <key>` - Your Novu Secret Key (required)
- `-a, --api-url <url>` - Novu API URL (default: https://api.novu.co)
- `-d, --directory <path>` - Directory containing files (default: ./translations)

## File Format

Translation files should be named with locale codes and contain valid JSON:

```
translations/
├── en_US.json
├── fr_FR.json
├── es_ES.json
└── de_DE.json
```

Example file content (`en_US.json`):
```json
{
  "workflows": {
    "welcome": {
      "subject": "Welcome to our platform!",
      "body": "Thank you for joining us."
    }
  }
}
```

## Environment Variables

You can set environment variables to avoid passing options repeatedly:

```bash
export NOVU_SECRET_KEY="your_secret_key_here"
export NOVU_API_URL="https://api.novu.co"  # or https://eu.api.novu.co for EU

# Now you can run commands without -s and -a flags
npx novu translations pull
npx novu translations push
```

## Supported Locales

The CLI supports standard locale codes including:
- `en_US`, `en_GB` (English)
- `es_ES` (Spanish)
- `fr_FR` (French)
- `de_DE` (German)
- `it_IT` (Italian)
- `pt_BR` (Portuguese)
- `ja_JP` (Japanese)
- `ko_KR` (Korean)
- `zh_CN`, `zh_TW` (Chinese)
- `ru_RU` (Russian)
- `ar_SA` (Arabic)
- `hi_IN` (Hindi)
- And many more...

## Error Handling

The CLI provides detailed error messages for common issues:
- Invalid API key
- Network connectivity problems
- Invalid JSON files
- Missing translation files
- File permission issues

## Tips

1. **Backup before pushing**: Always backup your existing translations before pushing new ones
2. **Validate JSON**: Ensure your JSON files are valid before pushing
3. **Use version control**: Track your translation files in git for better collaboration
4. **Test with pull**: Use `pull` command to see the expected file structure
