#!/bin/bash

# Vercel Deployment Script for NX Network Portals
# Usage: VERCEL_TOKEN=your_token bash deploy-vercel.sh

if [ -z "$VERCEL_TEAM_TOKEN" ]; then
  echo "Error: VERCEL_TEAM_TOKEN is not set."
  exit 1
fi

export VERCEL_ORG_ID="team_zEeC9fTESHnDu1Qe6FF4xyBA"

declare -A portals=(
  ["landing"]="prj_zeO2RO4kwXAitTBgRfk6eieLD7a3"
  ["pwa"]="prj_NsMSeZbYgwaEquE39Pcy8vYqnSIq"
  ["admin"]="prj_JpldBwlqpU9Bpeb46MbKfNuZDC7C"
  ["merchant"]="prj_ytyWgmVDQzwDg9kt4J6A4RQ1bElB"
  ["fmcg"]="prj_WAgU6jNfRjHLKZOmgwKuaYDAN0Ee"
  ["partners"]="prj_FTTAQ2uTnHcMR3Jtw9QwCQi2M613"
)

for target in "${!portals[@]}"; do
  project_id=${portals[$target]}
  echo "---------------------------------------------------"
  echo "Deploying $target to project_id $project_id..."
  echo "---------------------------------------------------"

  # Deploy to Vercel
  # We deploy the ROOT folder so /api functions are included!
  # --prod: Production deployment
  # --token: Use the provided token
  # --yes: Skip confirmation prompts
  # --build-env: pass the target app properly
  export VERCEL_PROJECT_ID=$project_id
  npx vercel deploy . --prod --token=$VERCEL_TEAM_TOKEN --yes --build-env VITE_APP_TARGET=$target
done

echo "All deployments completed!"

