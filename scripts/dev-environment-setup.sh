#!/bin/bash

[ -t 0 ] || exec </dev/tty 2>/dev/null || true

NEGATIVE_RESPONSE="No"
POSITIVE_RESPONSE="Yes"

# ─── macOS-only globals ────────────────────────────────────────────────────────

APPLE_CHIP='Apple'
ZPROFILE="$HOME/.zprofile"

# ─── helpers ──────────────────────────────────────────────────

error_message () {
    echo " "
    echo "❌ $1 has not been installed correctly"
    echo " "
}

skip_message () {
    echo " "
    echo "⏩ $1 installation has been skipped"
    echo " "
}

success_message () {
    echo " "
    echo "✅ $1 has been installed"
    echo " "
}

start_success_message () {
    echo " "
    echo "✅ $1 has been started"
    echo " "
}

already_installed_message () {
    echo " "
    echo "✅ $1 is already installed"
    echo " "
}

installing_dependency () {
    echo " "
    echo "🛠  $1 is installing"
    echo " "
}

updating_dependency () {
    echo " "
    echo "🛠  $1 is updating"
    echo " "
}

execute_command_without_error_print () {
    eval "$1" 2>/dev/null
}

# ─── OS / distro detection ────────────────────────────────────────────────────

detect_os() {
    OS_TYPE="$(uname -s)"

    if [[ "$OS_TYPE" == "Darwin" ]]; then
        DISTRO_FAMILY="macos"
        SHELL_PROFILE="$ZPROFILE"
        return
    fi

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID_LIKE $ID" in
            *debian*|*ubuntu*)  DISTRO_FAMILY="debian" ;;
            *rhel*|*fedora*|*centos*|*amzn*)  DISTRO_FAMILY="rhel" ;;
            *)                  DISTRO_FAMILY="unknown" ;;
        esac
    else
        DISTRO_FAMILY="unknown"
    fi

    SHELL_PROFILE="$HOME/.bashrc"
}

# ─── macOS-specific helpers ───────────────────────────────────────────────────

get_cpu () {
    sysctl -a | grep machdep.cpu.brand.string | cut -f2 -d":"
}

get_user_groups() {
    read -r -a USER_GROUP <<< "$(groups "$USER")"
}

set_user_dir_ownership() {
    get_user_groups
    sudo chown -R "$USER":"${USER_GROUP[0]}" "$1"
}

set_user_ownership() {
    get_user_groups
    sudo chown "$USER":"${USER_GROUP[0]}" "$1"
}

set_user_permissions() {
    sudo chmod 644 "$1"
    set_user_ownership "$1"
}

install_apple_chip_dependencies () {
    CPU=$(get_cpu)
    echo "Your CPU is: $CPU"
    if [[ "$CPU" == *"$APPLE_CHIP"* ]]; then
        ROSETTA_BOM_FILE="/Library/Apple/System/Library/Receipts/com.apple.pkg.RosettaUpdateAuto.bom"
        if [[ ! -f $ROSETTA_BOM_FILE ]]; then
            installing_dependency "Rosetta for Apple CPU"
            softwareupdate --install-rosetta
            success_message "Rosetta"
        else
            already_installed_message "Rosetta"
        fi
    fi
}

install_xcode () {
    echo ""
    echo "❓ Do you want to install Xcode? ($POSITIVE_RESPONSE / $NEGATIVE_RESPONSE)"
    read -r -p " > " RESPONSE
    echo ""

    if [[ "$RESPONSE" == "$POSITIVE_RESPONSE" ]]; then
        installing_dependency "Xcode"
        xcode-select --install &
        PID=$!
        wait $PID
        sudo xcode-select --switch /Library/Developer/CommandLineTools
        sudo xcodebuild -license accept
        xcodebuild -runFirstLaunch
        success_message "Xcode"
    elif [[ "$RESPONSE" == "$NEGATIVE_RESPONSE" ]]; then
        echo ""
        echo "❓ Do you want to update Xcode? ($POSITIVE_RESPONSE / $NEGATIVE_RESPONSE)"
        read -r -p " > " RESPONSE
        echo ""
        if [[ "$RESPONSE" == "$POSITIVE_RESPONSE" ]]; then
            updating_dependency "Xcode"
            softwareupdate --install --verbose Xcode &
            PID=$!
            wait $PID
            success_message "Xcode"
        fi
    fi
}

set_macosx_generics () {
    echo "Set macOS system configurations"
    defaults write com.apple.finder AppleShowAllFiles YES
}

make_zsh_default_shell () {
    if [[ "$SHELL" != "/bin/zsh" ]]; then
        echo "Let's make ZSH the default shell"
        chsh -s "$(which zsh)"
        echo "✅ ZSH made as default shell"
    fi
}

install_ohmyzsh () {
    echo ""
    echo "❓ Do you want to install Oh My Zsh! ? ($POSITIVE_RESPONSE / $NEGATIVE_RESPONSE)"
    read -r -p " > " RESPONSE
    echo ""

    if [[ "$RESPONSE" == "$POSITIVE_RESPONSE" ]]; then
        OHMYZSH_DIR="$HOME/.oh-my-zsh"
        if [[ ! -d $OHMYZSH_DIR ]]; then
            installing_dependency "Oh My Zsh!"
            curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh | $SHELL
            if [[ ! -d $OHMYZSH_DIR ]]; then
                error_message "Oh My Zsh!"
            else
                set_user_dir_ownership "$OHMYZSH_DIR"
                success_message "Oh My Zsh!"
            fi
        else
            already_installed_message "Oh My Zsh!"
        fi
    fi
}

check_homebrew () {
    TEST_BREW_CMD=$(execute_command_without_error_print "brew --version")
    if [[ -z "$TEST_BREW_CMD" ]] || [[ "$TEST_BREW_CMD" == "zsh: command not found: brew" ]]; then
        error_message "Homebrew"
        echo "⛔️ Homebrew is a hard dependency for this tool"
    fi
}

install_homebrew () {
    TEST_BREW_CMD=$(execute_command_without_error_print "brew --version")
    if [[ -z "$TEST_BREW_CMD" ]] || [[ "$TEST_BREW_CMD" == "zsh: command not found: brew" ]]; then
        installing_dependency "Homebrew"
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"

        APPLE_CHIP_BREW_BIN="/opt/homebrew/bin"
        BREW_BIN="/usr/local/bin"
        ENTRY="export PATH=$BREW_BIN:$APPLE_CHIP_BREW_BIN:\$PATH"
        PARAM_TO_CMD="grep -R $ENTRY $ZPROFILE"
        CMD=$(execute_command_without_error_print "$PARAM_TO_CMD")

        if [[ -z $CMD ]]; then
            echo "$ENTRY" | sudo tee -a "$ZPROFILE"
            set_user_permissions "$ZPROFILE"
            source "$ZPROFILE"
        fi

        AFTER_INSTALL_TEST_CMD=$(execute_command_without_error_print "brew --version")
        if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == "zsh: command not found: brew" ]]; then
            error_message "Homebrew"
            exit 1
        else
            success_message "Homebrew"
        fi
    else
        already_installed_message "Homebrew"
    fi
}

install_homebrew_recipes () {
    SKIP="$(check_homebrew)"
    if [[ -z "$SKIP" ]]; then
        echo "Update and Upgrade Homebrew"
        brew update
        brew upgrade
    else
        skip_message "Homebrew tap"
        echo "$SKIP"
    fi
}

install_macosx_dependencies () {
    install_xcode
    install_apple_chip_dependencies
    set_macosx_generics
}

# ─── Linux package manager helpers ───────────────────────────────────────────

_pkg_updated=0
linux_pkg_update () {
    if [[ $_pkg_updated -eq 0 ]]; then
        echo "Updating system package index…"
        if [[ "$DISTRO_FAMILY" == "debian" ]]; then
            sudo apt-get update -y
        elif [[ "$DISTRO_FAMILY" == "rhel" ]]; then
            sudo yum makecache -y 2>/dev/null || sudo dnf makecache -y
        fi
        _pkg_updated=1
    fi
}

linux_pkg_install () {
    linux_pkg_update
    if [[ "$DISTRO_FAMILY" == "debian" ]]; then
        sudo apt-get install -y "$@"
    elif [[ "$DISTRO_FAMILY" == "rhel" ]]; then
        sudo yum install -y "$@" 2>/dev/null || sudo dnf install -y "$@"
    else
        echo "⚠️ Unknown distro family - cannot auto-install packages. Please install manually: $*"
        return 1
    fi
}

check_git () {
    TEST_GIT_CMD=$(execute_command_without_error_print "git --version")
    if [[ -z "$TEST_GIT_CMD" ]] || [[ "$TEST_GIT_CMD" == *"Failed to locate 'git'"* ]] || [[ "$TEST_GIT_CMD" == *"command not found"* ]]; then
        error_message "Git"
        echo "⛔️ Git is a hard dependency to clone the monorepo"
        exit 1
    fi
}

install_git_linux () {
    if ! command -v git &>/dev/null; then
        installing_dependency "Git"
        linux_pkg_install git
        if ! command -v git &>/dev/null; then
            error_message "Git"
            exit 1
        fi
        success_message "Git"
    else
        already_installed_message "Git"
    fi
}

check_nvm () {
    NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

    TEST_NVM_CMD=$(execute_command_without_error_print "nvm --version")
    if [[ -z "$TEST_NVM_CMD" ]] || [[ "$TEST_NVM_CMD" == *"command not found"* ]]; then
        error_message "NVM"
        echo "⛔️ NVM is a hard dependency for this tool"
    fi
}

install_nvm () {
    NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    LATEST_NVM_VERSION="v0.39.2"

    [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

    TEST_CMD=$(execute_command_without_error_print "nvm --version")
    if [[ -z "$TEST_CMD" ]] || [[ "$TEST_CMD" == *"command not found"* ]]; then
        installing_dependency "NVM"
        URL="https://raw.githubusercontent.com/nvm-sh/nvm/$LATEST_NVM_VERSION/install.sh"
        echo "Downloading NVM from $URL"
        /bin/bash -c "$(curl -fsSL $URL)"

        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

        NVM_LOADER='export NVM_DIR="$HOME/.nvm"'$'\n''[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"'
        if ! grep -q 'NVM_DIR' "$SHELL_PROFILE" 2>/dev/null; then
            echo "" >> "$SHELL_PROFILE"
            echo "$NVM_LOADER" >> "$SHELL_PROFILE"
        fi

        AFTER_INSTALL_TEST_CMD=$(execute_command_without_error_print "nvm --version")
        if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == *"command not found"* ]]; then
            error_message "NVM"
        else
            success_message "NVM"
        fi
    else
        already_installed_message "NVM"
    fi
}

install_node () {
    NODE_JS_VERSION="v22.22.1"
    REQUIRED_NODE_MAJOR="22"

    SKIP="$(check_nvm)"
    if [[ -z "$SKIP" ]]; then
        NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
        [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

        TEST_CMD=$(execute_command_without_error_print "node --version")
        if [[ -z "$TEST_CMD" ]] || [[ "$TEST_CMD" == *"command not found"* ]] || [[ "$TEST_CMD" != v${REQUIRED_NODE_MAJOR}.* ]]; then
            installing_dependency "Node.js $NODE_JS_VERSION"
            nvm install "$NODE_JS_VERSION"
            nvm alias default "$NODE_JS_VERSION"

            TEST_NODE_CMD=$(execute_command_without_error_print "node --version")
            if [[ -z "$TEST_NODE_CMD" ]] || [[ "$TEST_NODE_CMD" == *"command not found"* ]]; then
                error_message "Node.js"
            else
                success_message "Node.js $NODE_JS_VERSION"
            fi
        else
            already_installed_message "Node.js $NODE_JS_VERSION"
        fi
    else
        skip_message "Node.js $NODE_JS_VERSION"
        echo "$SKIP"
    fi
}

install_pnpm () {
    PNPM_VERSION="10.33.0"
    TEST_PNPM_CMD=$(execute_command_without_error_print "pnpm --version")

    if [[ -z "$TEST_PNPM_CMD" ]] || [[ "$TEST_PNPM_CMD" == *"command not found"* ]]; then
        installing_dependency "PNPM $PNPM_VERSION"
        npm install -g pnpm@"$PNPM_VERSION"

        AFTER_INSTALL_TEST_CMD=$(execute_command_without_error_print "pnpm --version")
        if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == *"command not found"* ]]; then
            error_message "PNPM"
        else
            success_message "PNPM $PNPM_VERSION"
        fi
    else
        INSTALLED_VER="$TEST_PNPM_CMD"
        if [[ "$INSTALLED_VER" != "$PNPM_VERSION" ]]; then
            updating_dependency "PNPM (found $INSTALLED_VER → target $PNPM_VERSION)"
            npm install -g pnpm@"$PNPM_VERSION"
            success_message "PNPM $PNPM_VERSION"
        else
            already_installed_message "PNPM $PNPM_VERSION"
        fi
    fi
}

install_docker_linux () {
    if command -v docker &>/dev/null; then
        already_installed_message "Docker"
        return
    fi

    installing_dependency "Docker"

    if [[ "$DISTRO_FAMILY" == "debian" ]]; then
        curl -fsSL https://get.docker.com | sudo sh
        sudo usermod -aG docker "$USER"

    elif [[ "$DISTRO_FAMILY" == "rhel" ]]; then
        sudo yum install -y yum-utils 2>/dev/null || sudo dnf install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo 2>/dev/null || \
            sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null || \
            sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        sudo systemctl enable --now docker
        sudo usermod -aG docker "$USER"
    else
        echo "⚠️ Unsupported distro. Please install Docker manually: https://docs.docker.com/engine/install/"
        return 1
    fi

    if ! command -v docker &>/dev/null; then
        error_message "Docker"
        exit 1
    fi

    success_message "Docker"

    echo ""
    echo "⚠️ Docker was just installed and requires a system restart to apply group permissions."
    echo "   Please restart your computer and re-run the setup script to continue."
    echo ""
    exit 0
}

install_docker_macos () {
    SKIP="$(check_homebrew)"
    if [[ -z "$SKIP" ]]; then
        TEST_DOCKER_CMD=$(execute_command_without_error_print "docker --version")
        if [[ -z "$TEST_DOCKER_CMD" ]] || [[ "$TEST_DOCKER_CMD" == "zsh: command not found: docker" ]]; then
            installing_dependency "Docker"
            brew install --cask docker
            AFTER_INSTALL_TEST_CMD=$(execute_command_without_error_print "docker --version")
            if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == "zsh: command not found: docker" ]]; then
                error_message "Docker"
            else
                success_message "Docker"
            fi
        else
            already_installed_message "Docker"
        fi
    else
        skip_message "Docker"
        echo "$SKIP"
    fi
}

install_docker () {
    if [[ "$OS_TYPE" == "Darwin" ]]; then
        install_docker_macos
    else
        install_docker_linux
    fi
}

install_aws_cli_linux () {
    if command -v aws &>/dev/null; then
        already_installed_message "AWS CLI"
        return
    fi

    installing_dependency "AWS CLI"

    ARCH="$(uname -m)"
    TMP_DIR="$(mktemp -d)"
    ZIP_FILE="$TMP_DIR/awscliv2.zip"

    if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
        AWS_URL="https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip"
    else
        AWS_URL="https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"
    fi

    curl -fsSL "$AWS_URL" -o "$ZIP_FILE"
    unzip -q "$ZIP_FILE" -d "$TMP_DIR"
    sudo "$TMP_DIR/aws/install"
    rm -rf "$TMP_DIR"

    if ! command -v aws &>/dev/null; then
        error_message "AWS CLI"
    else
        success_message "AWS CLI"
    fi
}

install_aws_cli_macos () {
    FILE_DESTINATION="$HOME/AWSCLIV2.pkg"
    TEST_AWS_CMD=$(execute_command_without_error_print "aws --version")

    if [[ -z "$TEST_AWS_CMD" ]] || [[ "$TEST_AWS_CMD" == "zsh: command not found: aws" ]]; then
        installing_dependency "AWS CLI"
        curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "$FILE_DESTINATION"
        sudo installer -pkg "$FILE_DESTINATION" -target /

        AFTER_INSTALL_TEST_CMD=$(execute_command_without_error_print "aws --version")
        if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == "zsh: command not found: aws" ]]; then
            error_message "AWS CLI"
        else
            success_message "AWS CLI"
        fi
    else
        already_installed_message "AWS CLI"
    fi

    [[ -f "$FILE_DESTINATION" ]] && rm "$FILE_DESTINATION"
}

install_aws_cli () {
    if [[ "$OS_TYPE" == "Darwin" ]]; then
        install_aws_cli_macos
    else
        install_aws_cli_linux
    fi
}

# ─── Linux system prerequisites ──────────────────────────────────────────────

install_linux_base_deps () {
    installing_dependency "Linux base dependencies (curl, unzip, git…)"

    if [[ "$DISTRO_FAMILY" == "debian" ]]; then
        linux_pkg_install curl unzip git ca-certificates gnupg lsb-release build-essential
    elif [[ "$DISTRO_FAMILY" == "rhel" ]]; then
        linux_pkg_install curl unzip git ca-certificates gnupg2 which
    else
        echo "⚠️  Unknown distro - skipping base dependency installation."
    fi

    success_message "Linux base dependencies"
}

# ─── Database / Docker Compose ───────────────────────────────────────────────

start_database () {
    echo ""
    echo "❓ Enter the path to the Novu repo (default: ${NOVU_REPO_PATH:-none}, Enter to skip):"
    read -r -p " > " INPUT
    echo ""

    NOVU_FOLDER="${INPUT:-$NOVU_REPO_PATH}"

    if [[ -z "$NOVU_FOLDER" ]]; then
        skip_message "Database setup"
        return 0
    fi

    NOVU_FOLDER="${NOVU_FOLDER%/}"

    if [[ ! -d "$NOVU_FOLDER/docker" ]]; then
        echo "❌ No docker directory found at $NOVU_FOLDER — skipping database start."
        return 1
    fi

    cd "$NOVU_FOLDER" || return 1

    already_installed=0

    if [[ "$OS_TYPE" == "Darwin" ]]; then
        brew ls --versions mongodb &>/dev/null && { echo "Warning: MongoDB is already installed via brew. Please uninstall it first."; already_installed=1; }
        brew ls --versions redis    &>/dev/null && { echo "Warning: Redis is already installed via brew. Please uninstall it first.";    already_installed=1; }
    else
        ss -tlnp | grep -q ':27017' && { echo "Warning: MongoDB is running on port 27017. Please stop it first."; already_installed=1; }
        ss -tlnp | grep -q ':6379'  && { echo "Warning: Redis is running on port 6379. Please stop it first."; already_installed=1; }
    fi

    if [[ $already_installed -ne 1 ]]; then
        if [[ -f ./docker/local/.env ]]; then
            echo "./docker/local/.env already exists - keeping existing file."
        else
            cp ./docker/.env.example ./docker/local/.env
        fi

        if docker compose version &>/dev/null 2>&1; then
            docker compose -f ./docker/local/docker-compose.yml up -d
        else
            docker-compose -f ./docker/local/docker-compose.yml up -d
        fi

        start_success_message "Docker Infrastructure"
    else
        if [[ "$OS_TYPE" == "Darwin" ]]; then
            echo "We recommend removing mongodb and redis from brew with 'brew remove <package_name>'."
        else
            echo "We recommend stopping mongodb and redis services before proceeding."
            echo "e.g. 'sudo systemctl stop mongod redis'"
        fi
        echo "To manually start the containerized databases, go to /docker in the novu project."
    fi
}

clone_monorepo () {
    check_git
    REPOSITORY="https://github.com/novuhq/novu.git"
    DESTINATION_FOLDER="$HOME/Dev"
    NOVU_FOLDER="$DESTINATION_FOLDER/novu"

    echo ""
    echo "❓ Do you want to clone Novu's monorepo? ($POSITIVE_RESPONSE / $NEGATIVE_RESPONSE)"
    read -r -p " > " RESPONSE
    echo ""

    if [[ "$RESPONSE" == "$POSITIVE_RESPONSE" ]]; then
        [[ ! -d "$DESTINATION_FOLDER" ]] && mkdir -p "$DESTINATION_FOLDER"
        if [[ ! -d "$NOVU_FOLDER" ]]; then
            git clone "$REPOSITORY" "$NOVU_FOLDER"
            success_message "Novu monorepo"
        else
            already_installed_message "Novu monorepo"
        fi
        export NOVU_REPO_PATH="$NOVU_FOLDER"
    fi
}

install_novu_tools () {
    check_git
    install_nvm
    install_node
    install_pnpm
    install_docker
    install_aws_cli
}

# ─── OS entry point ──────────────────────────────────────────────────────────

install_os_dependencies () {
    if [[ "$OS_TYPE" == "Darwin" ]]; then
        echo "Install 🍎 macOS dependencies"
        make_zsh_default_shell
        install_ohmyzsh
        install_homebrew
        install_homebrew_recipes
        install_macosx_dependencies
        install_novu_tools

    elif [[ "$OS_TYPE" == "Linux" ]]; then
        echo "Install 🐧 Linux dependencies (family: $DISTRO_FAMILY)"
        install_linux_base_deps
        install_git_linux
        install_novu_tools

    else
        echo "❌ OS not supported: $OS_TYPE"
        exit 1
    fi
}

# ─── Main ────────────────────────────────────────────────────────────────────

detect_os
install_os_dependencies
clone_monorepo
start_database

echo ""
echo "✅ Setup complete! It may require a terminal restart for some packages to run!!"
echo ""
