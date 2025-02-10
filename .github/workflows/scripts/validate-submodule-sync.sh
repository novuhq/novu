#!/bin/bash

# Configuration
GITHUB_TOKEN="$GITHUB_TOKEN"
PRIVATE_REPO_BRANCH="next"
SOURCE_SUBMODULE=".source"

# Validate inputs
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN variable is required."
  exit 1
fi

echo "
🔍 Starting submodule synchronization check...
"

# Step 1: Fetch the latest commit hash from the private repository's next branch
echo "📡 Fetching latest commit hash from private repository..."
echo "   Branch: $PRIVATE_REPO_BRANCH"
echo ""

PRIVATE_REPO_URL_WITH_TOKEN="https://$GITHUB_TOKEN@github.com/novuhq/packages-enterprise.git"
PRIVATE_NEXT_HASH=$(git ls-remote "$PRIVATE_REPO_URL_WITH_TOKEN" "refs/heads/$PRIVATE_REPO_BRANCH" | awk '{print $1}')
if [ -z "$PRIVATE_NEXT_HASH" ]; then
  echo "❌ Error: Failed to fetch commit hash from private repository."
  echo "   Possible reasons:"
  echo "   - No access to the private repository"
  echo "   - Network connectivity issues"
  echo "   - Invalid repository URL"
  echo "   Please check your SSH access and network connection."
  echo ""
  exit 1
fi
echo "✅ Successfully fetched private repository hash"
echo "   Commit hash: $PRIVATE_NEXT_HASH"
echo ""

# Step 2: Get the current commit hash from the .source submodule
echo "📂 Checking .source submodule..."
if [ ! -d "$SOURCE_SUBMODULE" ]; then
  echo "❌ Error: .source submodule directory not found!"
  echo "   Please ensure:"
  echo "   1. Submodules are properly initialized (git submodule init)"
  echo "   2. Submodules are updated (git submodule update)"
  echo "   3. You're in the correct directory"
  echo ""
  exit 1
fi

MAIN_NEXT_HASH=$(cd "$SOURCE_SUBMODULE" && git rev-parse HEAD)
if [ -z "$MAIN_NEXT_HASH" ]; then
  echo "❌ Error: Failed to get commit hash from .source submodule."
  echo "   Please ensure:"
  echo "   1. The submodule contains a valid git repository"
  echo "   2. You have necessary permissions"
  echo ""
  exit 1
fi
echo "✅ Successfully retrieved submodule hash"
echo "   Commit hash: $MAIN_NEXT_HASH"
echo ""

# Step 3: Compare the hashes
echo "🔄 Comparing repository states..."
if [ "$MAIN_NEXT_HASH" != "$PRIVATE_NEXT_HASH" ]; then
  echo "❌ Synchronization check failed!"
  echo "   The .source submodule is out of sync with the private repository."
  echo ""
  echo "   Current state:"
  echo "   - Private repo hash: $PRIVATE_NEXT_HASH"
  echo "   - Submodule hash:   $MAIN_NEXT_HASH"
  echo ""
  echo "   To fix this:"
  echo "   1. Ensure the private repository's 'next' branch is up to date"
  echo "   2. Commit and push the updated submodule changes"
  echo ""
  exit 1
else
  echo "✅ Success! Everything is in sync."
  echo "   Both repositories are at commit: $MAIN_NEXT_HASH"
  echo ""
fi
