#!/bin/bash
echo "🛑 Stopping Eryzaa Rental Server..."

# Use the service manager
./manage_services.sh stop

echo "✅ Eryzaa stopped successfully!"
