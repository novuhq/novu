#!/bin/bash

# Configuration
SUBMODULES_TOKEN="$SUBMODULES_TOKEN"
TARGET_BRANCH="${1:-next}"  
SOURCE_SUBMODULE=".source"
TIMEOUT_SECONDS=5  # Timeout after 5 seconds

# Validate inputs
if [ -z "$SUBMODULES_TOKEN" ]; then
  echo "Error: SUBMODULES_TOKEN variable is required."
  exit 1
fi

echo "
🔍 Starting submodule synchronization check...
"

# Step 1: Fetch the latest commit hash from the private repository's target branch
echo "📡 Fetching latest commit hash from private repository..."
echo "   Branch: $TARGET_BRANCH"
echo ""

PRIVATE_REPO_URL_WITH_TOKEN="https://$SUBMODULES_TOKEN@github.com/novuhq/packages-enterprise.git"
PRIVATE_BRANCH_HASH=$(timeout $TIMEOUT_SECONDS git ls-remote "$PRIVATE_REPO_URL_WITH_TOKEN" "refs/heads/$TARGET_BRANCH" | awk '{print $1}')

if [ $? -eq 124 ]; then
  echo "❌ Error: Operation timed out after $TIMEOUT_SECONDS seconds."
  echo "   The git ls-remote command took too long to complete."
  echo "   Please check:"
  echo "   - Network connectivity"
  echo "   - GitHub API availability"
  echo "   - VPN or proxy settings if applicable"
  echo ""
  exit 1
fi

if [ -z "$PRIVATE_BRANCH_HASH" ]; then
  echo "❌ Error: Failed to fetch commit hash from private repository."
  echo "   Possible reasons:"
  echo "   - No access to the private repository"
  echo "   - Network connectivity issues"
  echo "   - Invalid repository URL or branch"
  echo "   - Branch '$TARGET_BRANCH' might not exist"
  echo "   Please check your access and ensure the branch exists."
  echo ""
  exit 1
fi
echo "✅ Successfully fetched private repository hash"
echo "   Commit hash: $PRIVATE_BRANCH_HASH"
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

MAIN_BRANCH_HASH=$(cd "$SOURCE_SUBMODULE" && git rev-parse HEAD)
if [ -z "$MAIN_BRANCH_HASH" ]; then
  echo "❌ Error: Failed to get commit hash from .source submodule."
  echo "   Please ensure:"
  echo "   1. The submodule contains a valid git repository"
  echo "   2. You have necessary permissions"
  echo ""
  exit 1
fi
echo "✅ Successfully retrieved submodule hash"
echo "   Commit hash: $MAIN_BRANCH_HASH"
echo ""

# Step 3: Compare the hashes
echo "🔄 Comparing repository states..."
if [ "$MAIN_BRANCH_HASH" != "$PRIVATE_BRANCH_HASH" ]; then
  echo "❌ Synchronization check failed!"
  echo "   The .source submodule is out of sync with the private repository."
  echo ""
  echo "   Current state:"
  echo "   - Private repo hash ($TARGET_BRANCH):  $PRIVATE_BRANCH_HASH"
  echo "   - Submodule hash:            $MAIN_BRANCH_HASH"
  echo ""
  echo "   To fix this:"
  echo "   1. Ensure the private repository's '$TARGET_BRANCH' branch is up to date"
  echo "   2. Ensure the monorepo repository point to the '$TARGET_BRANCH' branch at the private repository"
  echo ""
  exit 1
else
  echo "✅ Success! Everything is in sync."
  echo "   Both repositories are at commit: $MAIN_BRANCH_HASH"
  echo ""
fi
