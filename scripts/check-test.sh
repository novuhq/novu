#!/bin/bash

# set error flag
ERROR=0

# search for .only in test files
for file in $(find . -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.e2e.ts")
do
  if grep -q "\.only" "$file"; then
    echo "Error: Found '.only' in $file"
    ERROR=1
  fi
done

# exit with non-zero code if error was found
if [ $ERROR -ne 0 ]; then
  exit 1
fi
