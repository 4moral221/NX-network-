#!/bin/bash
nohup npx tsx run-deploy.js > deploy.log 2>&1 &
echo "Deployment started in background"
