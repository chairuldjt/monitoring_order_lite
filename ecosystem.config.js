module.exports = {
  apps: [
    {
      name: 'monitoring_order_lite',
      script: 'npm',
      args: 'run start',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5015,
      },
      // Error log file path
      error_file: './logs/err.log',
      // Standard output log file path
      out_file: './logs/out.log',
      // Merge logs
      merge_logs: true,
      // Auto restart on crash
      autorestart: true,
      // Watch for changes (disable in production generally, but here is false to be safe)
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
