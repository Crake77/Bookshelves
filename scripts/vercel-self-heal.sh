#!/usr/bin/env bash
set -euo pipefail

# --- config from env ---
: "${VERCEL_TOKEN:?Need VERCEL_TOKEN}"
: "${VERCEL_PROJECT:?Need VERCEL_PROJECT}"
: "${VERCEL_ORG:?Need VERCEL_ORG}"

vx() { npx --yes vercel@latest "$@"; }

echo "Linking project non-interactively…"
vx link --yes --project "$VERCEL_PROJECT" --org "$VERCEL_ORG" --token "$VERCEL_TOKEN" >/dev/null

echo "Pulling preview env/config…"
vx pull --environment=preview --yes --token "$VERCEL_TOKEN" >/dev/null

echo "Local reproducible build (mirrors Vercel)…"
if ! vx build --token "$VERCEL_TOKEN"; then
  echo ":: LOCAL_BUILD_FAILED ::"
  exit 12
fi

echo "Deploying prebuilt output…"
DEPLOY_URL="$(vx deploy --prebuilt --token "$VERCEL_TOKEN" | tail -n1 | tr -d '\r')"
echo "DEPLOY_URL=$DEPLOY_URL"

DEPLOY_ID="$(
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
    "https://api.vercel.com/v6/deployments?limit=1&url=$(echo "$DEPLOY_URL" | sed 's#https\?://##')" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d||'{}');console.log(j.deployments?.[0]?.uid||'');})"
)"

[ -n "$DEPLOY_ID" ] || { echo ":: NO_DEPLOY_ID_FOUND ::"; exit 13; }

echo "Polling deployment status…"
for i in {1..60}; do
  STATE="$(
    curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v13/deployments/$DEPLOY_ID" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d||'{}');console.log(j.readyState||j.state||'');})"
  )"
  echo "State: $STATE"
  if [ "$STATE" = "READY" ]; then
    echo ":: READY :: $DEPLOY_URL"
    exit 0
  fi
  if [ "$STATE" = "ERROR" ] || [ "$STATE" = "CANCELED" ]; then
    echo ":: DEPLOYMENT_FAILED :: streaming recent logs"
    vx logs "$DEPLOY_URL" --since 1h --token "$VERCEL_TOKEN" --follow=false | tail -n 200 || true
    exit 14
  fi
  sleep 5
done

echo ":: TIMEOUT_WAITING_FOR_READY :: recent logs"
vx logs "$DEPLOY_URL" --since 1h --token "$VERCEL_TOKEN" --follow=false | tail -n 200 || true
exit 15
