#!/bin/sh

exec </dev/tty

APPLE_CHIP='Apple'
#INTEL_CHIP='Intel'
NEGATIVE_RESPONSE="No"
POSITIVE_RESPONSE="Yes"

#ZSHRC="$HOME/.zshrc"
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

get_cpu () {
    SYSTEM_CPU_BRAND='machdep.cpu.brand.string'
    sysctl -a | grep $SYSTEM_CPU_BRAND | cut -f2 -d":"
}

refresh_shell() {
    # Refresh shell to apply changes in current session
    source "$ZPROFILE"
    exec $SHELL
}

get_user_groups() {
    # Get user groups
    read -r -a USER_GROUP <<< "$(groups $USER)"
}

set_user_dir_ownership() {
    USER_GROUP="$(get_user_groups)"
    sudo chown -R "$USER":"${USER_GROUP[0]}" "$1"
}

set_user_ownership() {
    USER_GROUP="$(get_user_groups)"
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
    read -p " > " RESPONSE
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
        read -p " > " RESPONSE
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

install_os_dependencies () {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        installing_dependency "Linux dependencies"
        echo "//TODO"
	install_novu_tools
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        installing_dependency "MacOsx dependencies"
        install_macosx_dependencies
        install_novu_tools
    else
        echo "OS not supported"
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
	    # Add the Brew paths to the shell profile
            echo "$ENTRY" | sudo tee -a "$ZPROFILE"

            # As executing `tee` as sudo changes ownership and permissions we roll them back appropriately 
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
        # Update Homebrew recipes
        echo "Tap, update and upgrade Homebrew"
        brew tap homebrew/cask
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

# Depends on Git so depends on having Xcode installed
install_ohmyzsh () {
    echo ""
    echo "❓ Do you want to install Oh My Zsh! ? ($POSITIVE_RESPONSE / $NEGATIVE_RESPONSE)"
    read -p " > " RESPONSE
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
    TEST_NVM_CMD=$(execute_command_without_error_print "nvm --version")

    if [[ -z "$TEST_NVM_CMD" ]] || [[ "$TEST_NVM_CMD" == "zsh: command not found: nvm" ]]; then
        error_message "NVM"
        echo "⛔️ NVM is a hard dependency for this tool"
    fi
}

install_node () {
    NODE_JS_VERSION="v16.15.1"

    SKIP="$(check_nvm)"

    if [[ -z "$SKIP" ]]; then
        TEST_CMD=$(execute_command_without_error_print "node --version")
        if [[ -z "$TEST_CMD" ]] || [[ "$TEST_CMD" == "zsh: command not found: node" ]]; then
            installing_dependency "Node.js $NODE_JS_VERSION"

            nvm install $NODE_JS_VERSION
	    TEST_NODE_CMD=$(execute_command_without_error_print "node --version")
	    
            if [[ -z "$TEST_NODE_CMD" ]] || [[ "$TEST_NODE_CMD" == "zsh: command not found: node" ]]; then
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


# NVM is a Node.js version manager
# Make sure that you have installed ZSH previously, so NVM can automatically inject the executable to PATH in the .zshrc config file.
install_nvm () {
    NVM_DIR="$HOME/.nvm"
    LATEST_NVM_VERSION="v0.39.2"

    TEST_CMD=$(execute_command_without_error_print "nvm --version")
    if [[ -z "$TEST_CMD" ]] || [[ "$TEST_CMD" == "zsh: command not found: nvm" ]]; then
        installing_dependency "NVM"
        URL="https://raw.githubusercontent.com/nvm-sh/nvm/$LATEST_NVM_VERSION/install.sh"
        echo "Downloading NVM from $URL"
	/bin/bash -c "$(curl -fsSL $URL)"

	# Loads NVM
	source "$NVM_DIR/nvm.sh"
	#source $ZSHRC
	
        AFTER_INSTALL_TEST_CMD=$(execute_command_without_error_print "nvm --version")
        if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == "zsh: command not found: nvm" ]]; then
	    error_message "NVM"
        else
            success_message "NVM"
        fi
    else
        already_installed_message "NVM"
    fi 
}

# PNPM is the package manager used in Novu's monorepo
install_pnpm () {
    PNPM_VERSION="7.5.0"
    TEST_PNPM_CMD=$(execute_command_without_error_print "pnpm --version")
    if [[ -z "$TEST_PNPM_CMD" ]] || [[ "$TEST_PNPM_CMD" == "zsh: command not found: pnpm" ]]; then
         installing_dependency "PNPM $PNPM_VERSION"
         npm install -g pnpm@$PNPM_VERSION

	 AFTER_INSTALL_TEST_CMD=$(execute_command_without_error_print "pnpm --version")
    	 if [[ -z "$AFTER_INSTALL_TEST_CMD" ]] || [[ "$AFTER_INSTALL_TEST_CMD" == "zsh: command not found: pnpm" ]]; then
             error_message "PNPM"
         else
             success_message "PNPM $PNPM_VERSION"
         fi
    else
         already_installed_message "PNPM $PNPM_VERSION"
    fi
}

install_docker () {
    SKIP="$(check_homebrew)"

    if [[ -z "$SKIP" ]]; then
        TEST_DOCKER_CMD=$(execute_command_without_error_print "docker --version")

        if [[ -z "$TEST_DOCKER_CMD" ]] || [[ "$TEST_DOCKER_CMD" == "zsh: command not found: docker" ]]; then
            installing_dependency "Docker"
    	    brew install docker
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

install_aws_cli () {
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

    if [[ -f $FILE_DESTINATION ]]; then
        rm "$FILE_DESTINATION"
    fi
}

install_databases () {
    SKIP="$(check_homebrew)"

    if [[ -z "$SKIP" ]]; then
        installing_dependency "Databases"

        brew tap mongodb/brew

        DATABASES=(
            mongodb-community@5.0
            redis
        )
        brew install "${DATABASES[@]}"

        echo "Run the services in the background"

        TEST_REDIS_CMD=$(execute_command_without_error_print "redis-cli --version")
        if [[ -z "$TEST_REDIS_CMD" ]] || [[ "$TEST_REDIS_CMD" == "zsh: command not found: redis-cli" ]]; then
            error_message "Redis"
        else
            echo "Run Redis service in the background"
    	    brew services restart redis
            success_message "MongoDB"
        fi

        TEST_MONGO_CMD=$(execute_command_without_error_print "mongosh --version")
        if [[ -z "$TEST_MONGO_CMD" ]] || [[ "$TEST_MONGO_CMD" == "zsh: command not found: mongosh" ]]; then
            error_message "MongoDB"
        else
            echo "Run MongoDB service in the background"
    	    brew services start mongodb/brew/mongodb-community@5.0
            success_message "MongoDB"
        fi
    else
        skip_message "Databases"
        echo "$SKIP"
    fi
}

create_local_dev_domain () {
    FILENAME="/etc/hosts"
    HOST="local.novu.co"
    IP="127.0.0.1"
    ENTRY="$IP\t$HOST"
    
    CMD=$(execute_command_without_error_print "grep -R $HOST $FILENAME")

    if [[ -z $CMD ]]; then
        echo "$ENTRY" | sudo tee -a $FILENAME
        success_message "Local DEV domain"
    elif [[ $CMD == *"$HOST"* ]]; then
        already_installed_message "Local DEV domain"
    else
        error_message "Local DEV domain"
    fi
}

check_git () {
    TEST_GIT_CMD=$(execute_command_without_error_print "git --version")

    if [[ -z "$TEST_GIT_CMD" ]] || [[ "$TEST_GIT_CMD" == *"Failed to locate 'git'"* ]]; then
        error_message "Git"
        echo "⛔️ Git is a hard dependency to clone the monorepo"
        exit 1
    fi
}

clone_monorepo () {
    SKIP="$(check_git)"

    if [[ -z "$SKIP" ]]; then
        echo ""
        echo "❓ Do you want to clone Novu's monorepo? ($POSITIVE_RESPONSE / $NEGATIVE_RESPONSE)"
        read -p " > " RESPONSE
	echo ""

    	if [[ "$RESPONSE" == "$POSITIVE_RESPONSE" ]]; then
            REPOSITORY="git@github.com:novuhq/novu.git"
            DESTINATION_FOLDER="$HOME/Dev"
            NOVU_FOLDER="$DESTINATION_FOLDER/novu"

            [[ ! -d "$DESTINATION_FOLDER" ]] && mkdir "$DESTINATION_FOLDER"
            if [[ ! -d "$NOVU_FOLDER" ]]; then
                git clone "$REPOSITORY $NOVU_FOLDER"
	        success_message "Novu monorepo"
            else
                already_installed_message "Novu monorepo"
            fi
        fi
    else
        skip_message "Novu monorepo"
        echo "$SKIP"
    fi
}

# Novu set of tools chosen
install_novu_tools () {
    check_git
    make_zsh_default_shell
    install_ohmyzsh
    install_homebrew
    install_homebrew_recipes
    install_nvm
    install_node
    install_pnpm
    install_docker
    install_databases
    install_aws_cli
    create_local_dev_domain
}

install_os_dependencies () {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Install 🐧 Linux dependencies"
        echo "//TODO"
	install_novu_tools
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Install 👿 MacOSx dependencies"
        install_macosx_dependencies
        install_novu_tools
    else
        echo "OS not supported"
    fi
}

# Entry point
install_os_dependencies
clone_monorepo
refresh_shell

