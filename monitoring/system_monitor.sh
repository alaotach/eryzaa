#!/bin/bash
# System monitoring script for Eryza

LOGFILE="logs/system_monitor.log"

while true; do
    echo "$(date): System Status Check" >> $LOGFILE
    
    # Check Docker containers
    docker ps --format "table {{.Names}}\t{{.Status}}" >> $LOGFILE
    
    # Check ZeroTier
    if sudo zerotier-cli info &> /dev/null; then
        echo "ZeroTier: Running" >> $LOGFILE
        sudo zerotier-cli listnetworks >> $LOGFILE
    else
        echo "ZeroTier: Stopped" >> $LOGFILE
    fi
    
    # System resources
    echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)" >> $LOGFILE
    echo "Memory: $(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')" >> $LOGFILE
    echo "---" >> $LOGFILE
    
    sleep 30
done
