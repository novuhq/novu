/**
 * WARN:
 * Ensure we always return exit code 0 or exit code 1 as these are the defaults docker healthcheck can currently handle
 */

/**
 * NOTE: This should be the port used inside the container.
 * Pass in the port to the script via argv or use default
 */
const port = process.argv[2] ?? 4200;

// Assemble Webserver Url
const webServerUrl = `http://127.0.0.1:${port}`;

/**
 * Healthcheck for the `web` docker container
 *
 * Runs a fetch request and evaluats the response code
 */
async function webHealthcheck() {
  try {
    const response = await fetch(webServerUrl);

    if (response.status === 200) {
      const successMessage = `Healthcheck passed for 'web' container at ${webServerUrl}`;

      process.stdout.write(successMessage);

      process.exit(0);
    }

    process.stderr.write(`Unexpected response status: ${response.status}`);

    process.exit(1);
  } catch (error) {
    const errorMessage = `Healthcheck failed for 'web' container at ${webServerUrl}`;

    process.stdout.write(errorMessage + error);

    process.exit(1);
  }
}

// Run Healthcheck
webHealthcheck();
