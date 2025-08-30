#!/bin/bash

while true; do
    if ! pgrep -f "wechat-group-sender" > /dev/null; then
        echo "$(date): 进程已停止，正在重启..."
        cd /path/to/your/project
        npm start &
    fi
    sleep 60
done    