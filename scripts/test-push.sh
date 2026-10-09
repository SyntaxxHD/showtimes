#!/usr/bin/env bash
set -euo pipefail

DB="${DB_PATH:-cinema.db}"

VAPID_PUB=$(sqlite3 "$DB" "SELECT value FROM config WHERE key='vapid_public_key'")
VAPID_PVT=$(sqlite3 "$DB" "SELECT value FROM config WHERE key='vapid_private_key'")
ENDPOINT=$(sqlite3 "$DB" "SELECT endpoint FROM push_subscriptions LIMIT 1")
P256DH=$(sqlite3 "$DB" "SELECT p256dh FROM push_subscriptions LIMIT 1")
AUTH=$(sqlite3 "$DB" "SELECT auth FROM push_subscriptions LIMIT 1")

if [[ -z "$ENDPOINT" ]]; then
  echo "No push subscriptions found in $DB" >&2
  exit 1
fi

TITLE="${1:-Die Tribute von Panem: Sunrise on the Reaping}"
BODY="${2:-Erste Vorstellung: 21.03.25, 20:15}"

./node_modules/.bin/web-push send-notification \
  --endpoint="$ENDPOINT" \
  --key="$P256DH" \
  --auth="$AUTH" \
  --vapid-subject="mailto:admin@example.com" \
  --vapid-pubkey="$VAPID_PUB" \
  --vapid-pvtkey="$VAPID_PVT" \
  --payload="{\"title\":\"$TITLE\",\"body\":\"$BODY\",\"url\":\"/program\"}"
