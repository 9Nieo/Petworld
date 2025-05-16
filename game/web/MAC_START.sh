#!/bin/bash

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js not detected, please install Node.js first"
    echo "You can visit https://nodejs.org/ to download"
    echo "Or use the following commands to install:"
    echo "Ubuntu: sudo apt install nodejs npm"
    echo "Mac (using Homebrew): brew install node"
    
    # Ask if the user wants to open the download page
    read -p "Would you like to open the Node.js download page? (y/n): " open_browser
    if [ "$open_browser" = "y" ] || [ "$open_browser" = "Y" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            open "https://nodejs.org/en/download/"
        else
            # Linux
            xdg-open "https://nodejs.org/en/download/"
        fi
    fi
    
    exit 1
fi

# Check if http-server is installed
if ! command -v http-server &> /dev/null; then
    echo "Installing http-server..."
    npm install -g http-server
fi

# Display startup information
echo "Starting Pet World game server..."
echo "The browser will automatically open after the server starts"
echo "To access manually, open the browser and go to http://localhost:8080"
echo "Press Ctrl+C to stop the server"

# Get the current script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Start http-server
cd "$SCRIPT_DIR"

# Start the server and run in the background
http-server -p 8080 -c-1 &
SERVER_PID=$!

# Wait for the server to start
sleep 2

# Open the browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "http://localhost:8080"
else
    # Linux
    xdg-open "http://localhost:8080"
fi

# Wait for user to press Ctrl+C
echo "Server started, press Ctrl+C to stop the server"
wait $SERVER_PID 