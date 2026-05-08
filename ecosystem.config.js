module.exports = {
  apps: [
    {
      name: 'net-latency-web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'net-latency-worker',
      script: 'worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
