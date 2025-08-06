import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

console.time('dotenvcreate');

const { argv } = yargs(hideBin(process.argv))
  .option('secretName', {
    alias: 's',
    type: 'string',
    description: 'The name of the secret',
    demandOption: false,
  })
  .option('region', {
    alias: 'r',
    type: 'string',
    description: 'The region',
    demandOption: false,
  })
  .option('enterprise', {
    alias: 'e',
    type: 'string',
    description: 'Whether this is an enterprise deployment',
    default: 'false',
  })
  .option('env', {
    alias: 'v',
    type: 'string',
    description: 'The environment',
    demandOption: true,
  })
  .option('selfHosted', {
    alias: 'h',
    type: 'string',
    description: 'Whether this is a self-hosted enterprise deployment',
    default: 'false',
  });

const { secretName, region, env } = argv;

// Helper function to parse string boolean values
function parseBooleanString(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
  }
  return false;
}

const enterprise = parseBooleanString(argv.enterprise);
const selfHosted = parseBooleanString(argv.selfHosted);

// Check deployment mode
if (!enterprise) {
  console.log('Booting up community version');
  process.exit(0);
}

if (enterprise && selfHosted) {
  console.log('Booting up Enterprise Self-Hosted Version');
  process.exit(0);
}

console.log('Booting up enterprise cloud version');

// Validate required parameters for cloud enterprise
if (!secretName || !region) {
  console.error('Error: secretName and region are required for enterprise cloud deployment');
  process.exit(1);
}

const secretsManagerClient = new SecretsManagerClient({
  region,
});

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to retrieve secret value
async function getSecretValue(secretName) {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const data = await secretsManagerClient.send(command);

    // Check if the secret value is a string or binary
    if (data.SecretString) {
      return JSON.parse(data.SecretString);
    } else {
      // Handle binary secret value
      const buff = Buffer.from(data.SecretBinary, 'base64');

      return JSON.parse(buff.toString('ascii'));
    }
  } catch (err) {
    console.error('Error retrieving secret:', err);
    throw err;
  }
}

// Function to escape or quote values for .env format
function escapeValue(value) {
  // If the value contains special characters or spaces, quote it
  if (value && /[ \t"=$]/.test(value)) {
    // Escape backslashes and double quotes, then wrap the value in quotes
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  return value;
}

// Function to update or add to .env file with new key-value pairs (for cloud enterprise)
async function updateEnvFile() {
  try {
    const secret = await getSecretValue(secretName);
    const envPath = resolve(__dirname, env === 'dev' ? '.env.development' : '.env.production');

    // Read the existing .env file if it exists
    let envContent = '';
    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, 'utf8');
    }

    // Create a Map to store existing keys from .env
    const existingEnvVars = new Map();
    envContent.split('\n').forEach((line) => {
      const [key, value] = line.split('=');
      if (key && value) {
        existingEnvVars.set(key.trim(), value.trim());
      }
    });

    // Convert secret into .env format
    const newEnvVariables = Object.entries(secret).map(([key, value]) => {
      // Escape value to handle special characters/spaces correctly
      const escapedValue = escapeValue(value);

      // Update or add new key-value pair
      if (existingEnvVars.has(key)) {
        existingEnvVars.set(key, escapedValue); // Update existing value
      } else {
        existingEnvVars.set(key, escapedValue); // Add new key-value pair
      }
    });

    // Ensure IS_SELF_HOSTED is set to false for cloud enterprise
    existingEnvVars.set('IS_SELF_HOSTED', 'false');

    // Combine all the updated key-value pairs into a string
    const updatedEnvContent = Array.from(existingEnvVars.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Write the updated .env file
    writeFileSync(envPath, updatedEnvContent);
    console.log(`${envPath} file updated successfully`);
  } catch (err) {
    console.error('Error updating .env file:', err);
  }
}

// Run the script for cloud enterprise
updateEnvFile();
console.timeEnd('dotenvcreate');
