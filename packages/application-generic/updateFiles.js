const fs = require('fs');
const glob = require('glob');

// Define the regular expression pattern to match async execute() functions
const asyncExecutePattern = /async execute\(/g;

// Define the decorator to add
const decoratorToAdd = '@InstrumentUsecase()';

// Define the import statement to add
const importStatementToAdd =
  "import { InstrumentUsecase } from '../../instrumentation';";

const usecaseName = 'InstrumentUsecase';

// Define the directory to scan
const directoryToScan = 'src/**/*.ts'; // Update this to match your specific file structure

// Find all files matching the directory pattern
const files = glob.sync(directoryToScan);
console.log(files);

// Loop through each file
files.forEach((file) => {
  // Read the file content
  const fileContent = fs.readFileSync(file, 'utf8');

  // Check if the file contains async execute() functions
  if (fileContent.match(asyncExecutePattern)) {
    // Split the file content into lines
    let lines = fileContent.split('\n');

    // Check if the import statement exists, if not add it to the first line
    if (!fileContent.includes(usecaseName)) {
      lines.splice(0, 0, importStatementToAdd);
    }

    // Loop through each line
    for (let i = 0; i < lines.length; i++) {
      // Check if the line contains async execute() function
      if (lines[i].match(asyncExecutePattern)) {
        // Check if the previous line doesn't contain the decorator, if not add it
        if (i > 0 && !lines[i - 1].includes(decoratorToAdd)) {
          lines[i - 1] = lines[i - 1] + '\n' + decoratorToAdd;
        }
        break; // Exit the loop after the first match
      }
    }

    // Write the updated file content back to the file
    fs.writeFileSync(file, lines.join('\n'), 'utf8');

    console.log(`Added decorator and import statement to file: ${file}`);
  }
});

console.log('Application files updated successfully!');
