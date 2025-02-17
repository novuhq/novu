import { writeFileSync } from 'fs';
import { bootstrap } from './src/bootstrap'; // Adjust the path according to your project structure

async function exportOpenAPIJSON() {
  try {
    process.env.LOCAL_SWAGGER_GENERATION = 'true';
    const { app, document } = await bootstrap({ internalSdkGeneration: true });

    // Write the Swagger document to a file
    writeFileSync('./dist/swagger-spec.json', JSON.stringify(document, null, 2));
    console.log('Swagger document generated at swagger-spec.json');

    // Close the application
    await app.close();
    console.log('App Closed');
  } catch (error) {
    console.error('Error generating Swagger document:', error);
  } finally {
    // Ensure the process exits
    process.exit();
  }
}

exportOpenAPIJSON();
