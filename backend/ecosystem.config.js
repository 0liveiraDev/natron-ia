module.exports = {
  apps: [{
    name: 'natron-ia-backend',
    script: './dist/server.js',
    instances: 1,           // Uma instância — evita competição por conexões MySQL
    watch: false,
    ignore_watch: ['uploads', 'node_modules', '*.db', '*.sqlite', 'logs'],

    // 🛡️ ESCUDO DE ESTABILIDADE — Limites de memória
    max_memory_restart: '200M',         // Reinicia se ultrapassar 200MB de RAM
    node_args: '--max-old-space-size=180', // Limita o heap V8 para evitar OOM

    // Restart policy com backoff para não sobrecarregar em loop de crash
    exp_backoff_restart_delay: 100,
    max_restarts: 10,       // Máx 10 restarts seguidos antes de desistir
    min_uptime: '10s',      // Só conta como "iniciado" após 10s de uptime

    // Logs persistentes
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    time: true,             // Adiciona timestamp a cada linha de log
    log_date_format: 'YYYY-MM-DD HH:mm:ss',

    env: {
      NODE_ENV: 'production',
    },
  }],
};

