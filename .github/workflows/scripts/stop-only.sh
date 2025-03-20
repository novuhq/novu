#!/bin/bash

# Define the search directory (default to current directory)
SEARCH_DIR=${1:-.}

# Find all matching test files and search for ".only"
echo "🔍 Searching for '.only' in test files"

# Search for .only patterns and store results
FOUND_FILES=$(grep -r "it.only\|describe.only\|test.only" "$SEARCH_DIR" \
  --include="*.e2e.ts" \
  --include="*.e2e-ee.ts" \
  --include="*.spec.ts" \
  --include="*.test.ts" \
  --exclude-dir={node_modules,dist,build} \
  -n | cut -d ":" -f 1,2)

# Check if any files were found
if [ -n "$FOUND_FILES" ]; then
  echo ""
  echo "🥵  Found '.only' in the following files:"
  echo "$FOUND_FILES"
  echo ""
  echo "🧹🧹🧹 Please remove '.only' before committing!"
  exit 1
else
  echo "✅ No '.only' found in test files."
  exit 0
fi
