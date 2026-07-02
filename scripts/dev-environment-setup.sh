#!/bin/bash
set -uo pipefail

[ -t 0 ] || exec </dev/tty

APPLE_CHIP='Apple'
NEGATIVE_RESPONSE="No"
POSITIVE_RESPONSE="Yes"

OS_TYPE=""
DISTRO_FAMILY=""
SHELL_PROFILE=""
NOVU_REPO_PATH=""

ZPROFILE="$HOME/.zprofile"

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
    $1 2> /dev/null
}

detect_os () {
    case "$(uname -s)" in
        Darwin)
            OS_TYPE="Darwin"
            SHELL_PROFILE="$ZPROFILE"
            ;;
        Linux)
            OS_TYPE="Linux"
            case "$(basename "${SHELL:-bash}")" in
                zsh) SHELL_PROFILE="${ZDOTDIR:-$HOME}/.zshrc" ;;
                bash|sh) SHELL_PROFILE="$HOME/.bashrc" ;;
                *) SHELL_PROFILE="$HOME/.profile" ;;
            esac
            if [ -f /etc/os-release ]; then
                DISTRO_FAMILY="$(
                    . /etc/os-release
                    case "$ID_LIKE $ID" in
                        *debian*|*ubuntu*) echo debian ;;
                        *rhel*|*fedora*|*centos*|*amzn*) echo rhel ;;
                        *) echo unknown ;;
                    esac
                )"
            else
                DISTRO_FAMILY="unknown"
            fi
            ;;
        *)
            OS_TYPE="unsupported"
            ;;
    esac
}

rhel_pkg_manager () {
    if command -v dnf &>/dev/null; then
        echo dnf
    else
        echo yum
    fi
}

_pkg_updated=0
linux_pkg_update () {
    if [[ $_pkg_updated -eq 0 ]]; then
        echo "Updating system package index…"
        if [[ "$DISTRO_FAMILY" == "debian" ]]; then
            sudo apt-get update -y
        elif [[ "$DISTRO_FAMILY" == "rhel" ]]; then
            sudo "$(rhel_pkg_manager)" makecache -y
        fi
        _pkg_updated=1
    fi
}

linux_pkg_install () {
    if [[ "$DISTRO_FAMILY" == "debian" ]]; then
        linux_pkg_update
        sudo apt-get install -y "$@"
    elif [[ "$DISTRO_FAMILY" == "rhel" ]]; then
        linux_pkg_update
        sudo "$(rhel_pkg_manager)" install -y "$@"
    else
        echo "Unsupported Linux distribution. Supported families: Debian/Ubuntu and RHEL/Fedora/CentOS/Amazon Linux."
        return 1
    fi
}

get_cpu () {
    if [[ "$OS_TYPE" == "Darwin" ]]; then
        SYSTEM_CPU_BRAND='machdep.cpu.brand.string'
        sysctl -a | grep "$SYSTEM_CPU_BRAND" | cut -f2 -d":"
    fi
}

refresh_shell() {
    if [[ -f "$SHELL_PROFILE" ]]; then
        # shellcheck source=/dev/null
        source "$SHELL_PROFILE"
    fi
    if [[ -f "$HOME/.nvm/nvm.sh" ]]; then
        # shellcheck source=/dev/null
        source "$HOME/.nvm/nvm.sh"
    fi
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

append_to_shell_profile() {
    local entry="$1"
    if ! grep -qF "$entry" "$SHELL_PROFILE" 2>/dev/null; then
        echo "$entry" >> "$SHELL_PROFILE"
    fi
}

load_nvm() {
    export NVM_DIR="$HOME/.nvm"
    if [[ -s "$NVM_DIR/nvm.sh" ]]; then
        # shellcheck source=/dev/null
        source "$NVM_DIR/nvm.sh"
    fi
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
  fi

  if [[ "$RESPONSE" == "$NEGATIVE_RESPONSE" ]]; then
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
    echo "Set MacOSx system configurations"

    defaults write com.apple.finder AppleShowAllFiles YES
}

install_macosx_dependencies () {
    install_xcode
    install_apple_chip_dependencies
    set_macosx_generics
}

install_linux_base_deps () {
    if [[ "$DISTRO_FAMILY" == "unknown" ]]; then
        echo "Cannot install base packages: unsupported Linux distribution."
        return 1
    fi

    installing_dependency "Linux base dependencies"
    if ! linux_pkg_install curl ca-certificates gnupg git; then
        error_message "Linux base dependencies"
        return 1
    fi

    if [[ "$DISTRO_FAMILY" == "debian" ]]; then
        linux_pkg_install lsof iproute2 || true
    elif [[ "$DISTRO_FAMILY" == "rhel" ]]; then
        linux_pkg_install lsof iproute || true
    else
        linux_pkg_install lsof || true
    fi

    success_message "Linux base dependencies"
}

check_homebrew () {
    TEST_BREW_CMD=$(execute_command_without_error_print "brew --version")

    if [[ -z "$TEST_BREW_CMD" ]] || [[ "$TEST_BREW_CMD" == *"command not found"* ]]; then
        error_message "Homebrew"
        echo "⛔️ Homebrew is a hard dependency for this tool on macOS"
    fi
}

install_homebrew () {
    TEST_BREW_CMD=$(execute_command_without_error_print "brew --version")

    if [[ -z "$TEST_BREW_CMD" ]] || [[ "$TEST_BREW_CMD" == *"command not found"* ]]; then
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
        if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == *"command not found"* ]]; then
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

make_zsh_default_shell () {
    if [[ ! "$SHELL" == "/bin/zsh" ]]; then
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

check_nvm () {
    load_nvm
    TEST_NVM_CMD=$(execute_command_without_error_print "nvm --version")

    if [[ -z "$TEST_NVM_CMD" ]] || [[ "$TEST_NVM_CMD" == *"command not found"* ]]; then
        error_message "NVM"
        echo "⛔️ NVM is a hard dependency for this tool"
    fi
}

install_node () {
    NODE_JS_VERSION="22.22.1"

    SKIP="$(check_nvm)"

    if [[ -z "$SKIP" ]]; then
        load_nvm
        TEST_CMD=$(execute_command_without_error_print "node --version")
        if [[ -z "$TEST_CMD" ]] || [[ "$TEST_CMD" == *"command not found"* ]] || [[ "$TEST_CMD" != "v${NODE_JS_VERSION}" ]]; then
            installing_dependency "Node.js v$NODE_JS_VERSION"

            nvm install "$NODE_JS_VERSION"
            nvm alias default "$NODE_JS_VERSION"
            load_nvm
	    TEST_NODE_CMD=$(execute_command_without_error_print "node --version")

            if [[ -z "$TEST_NODE_CMD" ]] || [[ "$TEST_NODE_CMD" == *"command not found"* ]]; then
                error_message "Node.js"
	    else
                success_message "Node.js v$NODE_JS_VERSION"
            fi
         else
            already_installed_message "Node.js v$NODE_JS_VERSION"
         fi
    else
        skip_message "Node.js v$NODE_JS_VERSION"
        echo "$SKIP"
    fi
}

install_nvm () {
    NVM_DIR="$HOME/.nvm"
    LATEST_NVM_VERSION="v0.39.7"

    load_nvm
    TEST_CMD=$(execute_command_without_error_print "nvm --version")
    if [[ -z "$TEST_CMD" ]] || [[ "$TEST_CMD" == *"command not found"* ]]; then
        installing_dependency "NVM"
        URL="https://raw.githubusercontent.com/nvm-sh/nvm/$LATEST_NVM_VERSION/install.sh"
        echo "Downloading NVM from $URL"
	/bin/bash -c "$(curl -fsSL "$URL")"

	load_nvm

        AFTER_INSTALL_TEST_CMD=$(execute_command_without_error_print "nvm --version")
        if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == *"command not found"* ]]; then
	    error_message "NVM"
        else
            append_to_shell_profile 'export NVM_DIR="$HOME/.nvm"'
            append_to_shell_profile '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"'
            success_message "NVM"
        fi
    else
        already_installed_message "NVM"
    fi
}

install_pnpm () {
    PNPM_VERSION="11.0.9"
    load_nvm
    TEST_PNPM_CMD=$(execute_command_without_error_print "pnpm --version")
    if [[ -z "$TEST_PNPM_CMD" ]] || [[ "$TEST_PNPM_CMD" == *"command not found"* ]] || [[ "$TEST_PNPM_CMD" != "$PNPM_VERSION" ]]; then
         installing_dependency "PNPM $PNPM_VERSION"
         npm install -g "pnpm@$PNPM_VERSION"

	 AFTER_INSTALL_TEST_CMD=$(execute_command_without_error_print "pnpm --version")
    	 if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == *"command not found"* ]]; then
             error_message "PNPM"
         else
             success_message "PNPM $PNPM_VERSION"
         fi
    else
         already_installed_message "PNPM $PNPM_VERSION"
    fi
}

install_docker_macos () {
    SKIP="$(check_homebrew)"

    if [[ -z "$SKIP" ]]; then
        TEST_DOCKER_CMD=$(execute_command_without_error_print "docker --version")

        if [[ -z "$TEST_DOCKER_CMD" ]] || [[ "$TEST_DOCKER_CMD" == *"command not found"* ]]; then
            installing_dependency "Docker"
    	    brew install --cask docker
    	    AFTER_INSTALL_TEST_CMD=$(execute_command_without_error_print "docker --version")
    	    if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == *"command not found"* ]]; then
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

install_docker_linux () {
    TEST_DOCKER_CMD=$(execute_command_without_error_print "docker --version")

    if [[ -n "$TEST_DOCKER_CMD" ]] && [[ "$TEST_DOCKER_CMD" != *"command not found"* ]]; then
        already_installed_message "Docker"
        return 0
    fi

    installing_dependency "Docker"

    if [[ "$DISTRO_FAMILY" == "debian" ]]; then
        linux_pkg_install ca-certificates curl gnupg lsb-release
        sudo install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null || \
            curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
        local codename docker_distro os_id
        os_id="$(. /etc/os-release; echo "$ID")"
        codename="$(. /etc/os-release; echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")"
        docker_distro="ubuntu"
        if [[ "$os_id" == "debian" ]]; then
            docker_distro="debian"
        fi
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${docker_distro} \
          ${codename} stable" | \
          sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update -y
        linux_pkg_install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    elif [[ "$DISTRO_FAMILY" == "rhel" ]]; then
        linux_pkg_install yum-utils
        sudo "$(rhel_pkg_manager)" config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        linux_pkg_install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        sudo systemctl enable --now docker 2>/dev/null || sudo service docker start 2>/dev/null || true
    else
        error_message "Docker"
        return 1
    fi

    if ! groups "$USER" | grep -q '\bdocker\b'; then
        sudo usermod -aG docker "$USER"
        echo "Note: Added $USER to the docker group. You may need to log out and back in for group changes to apply."
    fi

    if ! docker info &>/dev/null; then
        if [[ -S /var/run/docker.sock ]]; then
            sudo chown root:docker /var/run/docker.sock 2>/dev/null || true
            sudo chmod 660 /var/run/docker.sock 2>/dev/null || true
        fi
        if ! docker info &>/dev/null; then
            echo "Docker is installed, but this shell does not have access to the daemon yet."
            echo "Run 'newgrp docker' or log out and back in, then retry."
        fi
    fi

    AFTER_INSTALL_TEST_CMD=$(execute_command_without_error_print "docker --version")
    if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == *"command not found"* ]]; then
        error_message "Docker"
        return 1
    fi

    success_message "Docker"
}

install_docker () {
    if [[ "$OS_TYPE" == "Darwin" ]]; then
        install_docker_macos
    elif [[ "$OS_TYPE" == "Linux" ]]; then
        install_docker_linux
    fi
}

install_aws_cli_macos () {
    FILE_DESTINATION="$HOME/AWSCLIV2.pkg"
    TEST_AWS_CMD=$(execute_command_without_error_print "aws --version")

    if [[ -z "$TEST_AWS_CMD" ]] || [[ "$TEST_AWS_CMD" == *"command not found"* ]]; then
        installing_dependency "AWS CLI"
        curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "$FILE_DESTINATION"
        sudo installer -pkg "$FILE_DESTINATION" -target /

        AFTER_INSTALL_TEST_CMD=$(execute_command_without_error_print "aws --version")
    	if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == *"command not found"* ]]; then
            error_message "AWS CLI"
        else
            success_message "AWS CLI"
        fi
    else
        already_installed_message "AWS CLI"
    fi

    if [[ -f $FILE_DESTINATION ]]; then
        rm "$FILE_DESTINATION"
    fi
}

install_aws_cli_linux () {
    TEST_AWS_CMD=$(execute_command_without_error_print "aws --version")

    if [[ -n "$TEST_AWS_CMD" ]] && [[ "$TEST_AWS_CMD" != *"command not found"* ]]; then
        already_installed_message "AWS CLI"
        return 0
    fi

    installing_dependency "AWS CLI"

    local arch zip_name tmp_dir
    case "$(uname -m)" in
        x86_64) arch="x86_64" ;;
        aarch64|arm64) arch="aarch64" ;;
        *)
            error_message "AWS CLI"
            echo "Unsupported architecture for AWS CLI install: $(uname -m)"
            return 1
            ;;
    esac

    zip_name="awscli-exe-linux-${arch}.zip"
    tmp_dir=$(mktemp -d)
    if ! command -v unzip &>/dev/null; then
        linux_pkg_install unzip
    fi
    curl -fsSL "https://awscli.amazonaws.com/${zip_name}" -o "${tmp_dir}/${zip_name}"
    unzip -q "${tmp_dir}/${zip_name}" -d "${tmp_dir}"
    sudo "${tmp_dir}/aws/install" --update
    rm -rf "${tmp_dir}"

    AFTER_INSTALL_TEST_CMD=$(execute_command_without_error_print "aws --version")
    if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == *"command not found"* ]]; then
        error_message "AWS CLI"
        return 1
    fi

    success_message "AWS CLI"
}

install_aws_cli () {
    if [[ "$OS_TYPE" == "Darwin" ]]; then
        install_aws_cli_macos
    elif [[ "$OS_TYPE" == "Linux" ]]; then
        install_aws_cli_linux
    fi
}

port_in_use () {
    local port="$1"
    if [[ "$OS_TYPE" == "Linux" ]]; then
        ss -ltn 2>/dev/null | grep -q ":${port} "
        return $?
    fi

    lsof -Pi ":${port}" -sTCP:LISTEN -t >/dev/null 2>&1
}

run_docker_compose () {
    local compose_file="$1"

    if docker compose version &>/dev/null; then
        if docker info &>/dev/null; then
            docker compose -f "$compose_file" up -d
            return $?
        fi
        if groups "$USER" | grep -q '\bdocker\b'; then
            sg docker -c "docker compose -f \"$compose_file\" up -d"
            return $?
        fi
        sudo docker compose -f "$compose_file" up -d
        return $?
    fi

    if command -v docker-compose &>/dev/null; then
        docker-compose -f "$compose_file" up -d
        return $?
    fi

    echo "Neither 'docker compose' nor 'docker-compose' is available."
    return 1
}

resolve_novu_repo_path () {
    if [[ -n "$NOVU_REPO_PATH" ]] && [[ -d "$NOVU_REPO_PATH" ]]; then
        echo "$NOVU_REPO_PATH"
        return 0
    fi

    if [[ -f "$(pwd)/package.json" ]] && [[ -d "$(pwd)/apps/api" ]] && grep -q '"setup:project"' "$(pwd)/package.json" 2>/dev/null; then
        echo "$(pwd)"
        return 0
    fi

    echo ""
    return 1
}

start_database() {
    local novu_folder
    novu_folder="$(resolve_novu_repo_path)"

    if [[ -z "$novu_folder" ]]; then
        echo ""
        echo "❓ Enter the path to your Novu repository (or press Enter to skip database startup):"
        read -r -p " > " novu_folder
        echo ""
        if [[ -z "$novu_folder" ]]; then
            skip_message "Docker Infrastructure"
            return 0
        fi
    fi

    if [[ ! -d "$novu_folder" ]]; then
        echo "Repository path does not exist: $novu_folder"
        return 1
    fi

    cd "$novu_folder" || return 1

    local already_installed=0

    if command -v brew &>/dev/null; then
        if brew ls --versions mongodb &>/dev/null; then
            echo "Warning: MongoDB is already installed via brew. Please uninstall it first."
            already_installed=1
        fi

        if brew ls --versions redis &>/dev/null; then
            echo "Warning: Redis is already installed via brew. Please uninstall it first."
            already_installed=1
        fi
    else
        echo "Checking default ports for MongoDB and Redis"
        if port_in_use 27017; then
            echo "Warning: MongoDB is running on port 27017. Please stop it first."
            already_installed=1
        fi
        if port_in_use 6379; then
            echo "Warning: Redis is running on port 6379. Please stop it first."
            already_installed=1
        fi
    fi

    if [[ $already_installed -ne 1 ]]; then
        local env_dest="./docker/local/.env"
        local env_example="./docker/.env.example"
        local compose_file="./docker/local/docker-compose.yml"

        if [[ ! -f "$compose_file" ]]; then
            echo "Docker compose file not found at $compose_file"
            return 1
        fi

        if [[ -f "$env_dest" ]]; then
            echo "Keeping existing $env_dest (not overwriting)."
        elif [[ -f "$env_example" ]]; then
            cp "$env_example" "$env_dest"
            echo "Created $env_dest from $env_example"
        fi

        if ! run_docker_compose "$compose_file"; then
            if [[ "$OS_TYPE" == "Linux" ]] && ! docker info &>/dev/null; then
                echo "⚠️  Docker daemon is not reachable. If you were just added to the docker group, run: newgrp docker"
                echo "Then start databases manually:"
                echo "  cd \"$novu_folder\" && docker compose -f docker/local/docker-compose.yml up -d"
            fi
            return 1
        fi

        start_success_message "Docker Infrastructure"
    else
        if [[ "$OS_TYPE" == "Darwin" ]]; then
            echo "We recommend removing mongodb and redis databases from brew with 'brew remove <package_name>'."
        else
            echo "Stop the services using ports 27017 and 6379, then run:"
            echo "  cd \"$novu_folder\" && docker compose -f docker/local/docker-compose.yml up -d"
        fi
    fi
}

check_git () {
    TEST_GIT_CMD=$(execute_command_without_error_print "git --version")

    if [[ -z "$TEST_GIT_CMD" ]] || [[ "$TEST_GIT_CMD" == *"Failed to locate 'git'"* ]]; then
        error_message "Git"
        echo "⛔️ Git is a hard dependency to clone the monorepo"
        exit 1
    fi

    already_installed_message "git"

}

install_git_linux () {
    TEST_GIT_CMD=$(execute_command_without_error_print "git --version")
    if [[ -n "$TEST_GIT_CMD" ]] && [[ "$TEST_GIT_CMD" != *"command not found"* ]]; then
        already_installed_message "Git"
        return 0
    fi

    installing_dependency "Git"
    if linux_pkg_install git; then
        success_message "Git"
    else
        error_message "Git"
        return 1
    fi
}

clone_monorepo () {
    SKIP="$(check_git)"

    if [[ -z "$SKIP" ]]; then
        echo ""
        echo "❓ Do you want to clone Novu's monorepo? ($POSITIVE_RESPONSE / $NEGATIVE_RESPONSE)"
        read -r -p " > " RESPONSE
	echo ""

    	if [[ "$RESPONSE" == "$POSITIVE_RESPONSE" ]]; then
            REPOSITORY="https://github.com/novuhq/novu.git"
            DESTINATION_FOLDER="$HOME/Dev"
            NOVU_FOLDER="$DESTINATION_FOLDER/novu"

            [[ ! -d "$DESTINATION_FOLDER" ]] && mkdir -p "$DESTINATION_FOLDER"
            if [[ ! -d "$NOVU_FOLDER" ]]; then
                git clone "$REPOSITORY" "$NOVU_FOLDER"
                NOVU_REPO_PATH="$NOVU_FOLDER"
                export NOVU_REPO_PATH
	        success_message "Novu monorepo"
            else
                NOVU_REPO_PATH="$NOVU_FOLDER"
                export NOVU_REPO_PATH
                already_installed_message "Novu monorepo"
            fi
        fi
    else
        skip_message "Novu monorepo"
        echo "$SKIP"
    fi
}

install_novu_tools_macos () {
    check_git
    make_zsh_default_shell
    install_ohmyzsh
    install_homebrew
    install_homebrew_recipes
    install_nvm
    install_node
    install_pnpm
    install_docker
    install_aws_cli
}

install_novu_tools_linux () {
    install_git_linux
    install_nvm
    install_node
    install_pnpm
    install_docker
    install_aws_cli
}

install_os_dependencies () {
    if [[ "$OS_TYPE" == "Linux" ]]; then
        echo "Install 🐧 Linux dependencies"
        install_linux_base_deps
        install_novu_tools_linux
    elif [[ "$OS_TYPE" == "Darwin" ]]; then
        echo "Install 👿 MacOSx dependencies"
        install_macosx_dependencies
        install_novu_tools_macos
    else
        echo "OS not supported"
        exit 1
    fi
}

# Entry point
detect_os
echo "Detected OS: $OS_TYPE${DISTRO_FAMILY:+ ($DISTRO_FAMILY)}"
install_os_dependencies
clone_monorepo
start_database
refresh_shell

echo ""
echo "🎉 Dev environment setup finished."
echo "Next: cd into your Novu repo and run pnpm setup:project (or npm run setup:project)."
