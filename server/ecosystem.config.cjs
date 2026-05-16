/**
 * PM2: staging и production.
 * Staging: pm2 start ecosystem.config.cjs --only skinexs-staging
 * Prod:    pm2 start ecosystem.config.cjs --only skinexs-prod
 */
module.exports = {
  apps: [
    {
      name: "skinexs-staging",
      cwd: __dirname,
      script: "index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "staging",
        DB_PATH: "/var/skinexs-data/staging.db",
      },
    },
    {
      name: "skinexs-prod",
      cwd: __dirname,
      script: "index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        DB_PATH: "/var/skinexs-data/prod.db",
      },
    },
  ],
};
