# Petworld Game - Web Setup Guide

## Prerequisites

Before running the game, ensure you have the following installed:

1. **Node.js**: The game requires Node.js to run. If you don't have it installed, follow these steps:
   - Download Node.js from [https://nodejs.org/en/download/](https://nodejs.org/en/download/).
   - Follow the installation instructions for your operating system.
   - Verify the installation by running `node -v` and `npm -v` in your terminal/command prompt.

## Running the Game

### Windows Users
1. Open the `game/web` directory in your terminal or File Explorer.
2. Double-click the `WIN_START.bat` file to start the game.
   - The script will automatically check for Node.js and `http-server` and install them if missing.
   - The game will open in your default browser at `http://localhost:8080`.

### Linux/macOS Users
1. Open the `game/web` directory in your terminal.
2. Run the following command to make the script executable (if not already):
   ```bash
   chmod +x MAC_START.sh
   ```
3. Execute the script:
   ```bash
   ./MAC_START.sh
   ```
   - The script will check for Node.js and `http-server` and guide you through installation if needed.
   - The game will open in your default browser at `http://localhost:8080`.

## Stopping the Game
- **Windows**: Close the terminal window where the server is running.
- **Linux/macOS**: Press `Ctrl+C` in the terminal where the server is running.

## Troubleshooting
- If the game doesn't start, ensure Node.js and `http-server` are installed correctly.
- For further issues, check the terminal/command prompt for error messages.

Enjoy playing Petworld! 