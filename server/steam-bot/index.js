const { startSteamBotServer } = require("./create-app");

if (require.main === module) {
  startSteamBotServer();
}

module.exports = require("./create-app");
