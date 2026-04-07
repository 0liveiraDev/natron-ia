module.exports = {
  apps: [{
    name: "trilha-ia-backend",
    script: "./dist/server.js",
    watch: false,
    ignore_watch: ["uploads", "node_modules", "*.sqlite"],
    env: {
      NODE_ENV: "production",
    }
  }]
};
