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
    demandOption: true,
  })
  .option('region', {
    alias: 'r',
    type: 'string',
    description: 'The region',
    demandOption: true,
  })
  .option('enterprise', {
    alias: 'e',
    type: 'string',
    description: 'The enterprise value',
    demandOption: true,
  })
  .option('env', {
    alias: 'v',
    type: 'string',
    description: 'The environment',
    demandOption: true,
  });

const { secretName, region, enterprise, env } = argv;

if (!enterprise || enterprise.toLowerCase() === 'false') {
  console.log('Enterprise value is false or not provided. Exiting script.');
  process.exit(0);
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

// Function to update or add to .env file with new key-value pairs
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

// Run the script
updateEnvFile();
console.timeEnd('dotenvcreate');
