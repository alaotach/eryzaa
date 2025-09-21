#!/bin/bash
echo "🚀 Starting Eryzaa Rental Server..."

# Use the service manager
./manage_services.sh start "${1:-fast}"

echo "✅ Eryzaa started successfully!"
echo "📊 Web Dashboard: http://localhost:5173"
echo "🖥️  CLI Interface: ./rental/target/release/rental"
echo "📈 Check status: ./manage_services.sh status"
