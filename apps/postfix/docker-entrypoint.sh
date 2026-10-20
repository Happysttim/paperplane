#!/bin/sh
set -efu

# Reject malformed values before writing Postfix configuration files.
fail() {
    printf 'Postfix configuration error: %s\n' "$1" >&2
    exit 1
}

# Accept DNS names and IPv4 literals, not Postfix expressions or shell syntax.
valid_host() {
    printf '%s\n' "$1" | grep -Eq '^([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)*[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$'
}

POSTFIX_HOSTNAME=${POSTFIX_HOSTNAME:-mail.paperplane.example}
POSTFIX_DB_HOST=${POSTFIX_DB_HOST:-postgres}
POSTFIX_DB_PORT=${POSTFIX_DB_PORT:-5432}
POSTFIX_DB_NAME=${POSTFIX_DB_NAME:-paperplane}
POSTFIX_DB_USER=${POSTFIX_DB_USER:-paperplane_postfix}
POSTFIX_DB_PASSWORD=${POSTFIX_DB_PASSWORD:-}
POSTFIX_TRUSTED_NETWORKS=${POSTFIX_TRUSTED_NETWORKS:-127.0.0.0/8}
FILTER_SMTP_HOST=${FILTER_SMTP_HOST:-host.docker.internal}
FILTER_SMTP_PORT=${FILTER_SMTP_PORT:-10025}
POSTFIX_MESSAGE_SIZE_LIMIT=${POSTFIX_MESSAGE_SIZE_LIMIT:-26214400}

valid_host "$POSTFIX_HOSTNAME" || fail 'POSTFIX_HOSTNAME must be a hostname'
valid_host "$FILTER_SMTP_HOST" || fail 'FILTER_SMTP_HOST must be a hostname or IPv4 address'
case "$FILTER_SMTP_PORT" in ''|*[!0-9]*) fail 'FILTER_SMTP_PORT must be numeric';; esac
[ "$FILTER_SMTP_PORT" -ge 1 ] && [ "$FILTER_SMTP_PORT" -le 65535 ] || fail 'FILTER_SMTP_PORT must be 1..65535'
case "$POSTFIX_MESSAGE_SIZE_LIMIT" in ''|*[!0-9]*) fail 'POSTFIX_MESSAGE_SIZE_LIMIT must be numeric';; esac
[ "$POSTFIX_MESSAGE_SIZE_LIMIT" -gt 0 ] || fail 'POSTFIX_MESSAGE_SIZE_LIMIT must be positive'
case "$POSTFIX_TRUSTED_NETWORKS" in ''|*[!0-9a-fA-F:.,/\ ]*) fail 'Use IP addresses/CIDRs in POSTFIX_TRUSTED_NETWORKS';; esac
case ",$POSTFIX_TRUSTED_NETWORKS," in *0.0.0.0/0,*|*::/0,*) fail 'Do not trust the entire Internet';; esac

# Validate connection values before writing one-line pgsql settings.
valid_host "$POSTFIX_DB_HOST" || fail 'POSTFIX_DB_HOST must be a hostname or IPv4 address'
case "$POSTFIX_DB_PORT" in ''|*[!0-9]*) fail 'POSTFIX_DB_PORT must be numeric';; esac
[ "$POSTFIX_DB_PORT" -ge 1 ] && [ "$POSTFIX_DB_PORT" -le 65535 ] || fail 'POSTFIX_DB_PORT must be 1..65535'
for value in "$POSTFIX_DB_NAME" "$POSTFIX_DB_USER"; do
    case "$value" in ''|*[!A-Za-z0-9_]*) fail 'DB name/user must contain only letters, digits, underscores';; esac
done
case "$POSTFIX_DB_PASSWORD" in ''|*[[:space:][:cntrl:]]*) fail 'POSTFIX_DB_PASSWORD must be nonempty without whitespace/control characters';; esac

# Keep credentials out of the image and restrict generated maps to root/Postfix.
install -d -m 0750 -o root -g postfix /etc/postfix/pgsql
for map in relay-domains relay-recipients; do
    target="/etc/postfix/pgsql/$map.cf"
    (umask 077
        # Replace explicit template settings instead of appending duplicate keys.
        awk -v hosts="$POSTFIX_DB_HOST:$POSTFIX_DB_PORT" \
            -v dbname="$POSTFIX_DB_NAME" -v user="$POSTFIX_DB_USER" '
            /^hosts[[:space:]]*=/ { print "hosts = " hosts; next }
            /^dbname[[:space:]]*=/ { print "dbname = " dbname; next }
            /^user[[:space:]]*=/ { print "user = " user; next }
            { print }
        ' "/etc/postfix/pgsql-templates/$map.cf" > "$target"
        printf '\npassword = %s\n' "$POSTFIX_DB_PASSWORD" >> "$target"
    )
    chown root:postfix "$target"
    chmod 0640 "$target"
done

postconf -e "myhostname = $POSTFIX_HOSTNAME"
postconf -e "mynetworks = $POSTFIX_TRUSTED_NETWORKS"
postconf -e "content_filter = scan:[$FILTER_SMTP_HOST]:$FILTER_SMTP_PORT"
postconf -e "message_size_limit = $POSTFIX_MESSAGE_SIZE_LIMIT"

# A complete mounted certificate pair is used as-is. Partial pairs are errors.
cert=/etc/postfix/tls/fullchain.pem
key=/etc/postfix/tls/privkey.pem
if [ -f "$cert" ] || [ -f "$key" ]; then
    [ -s "$cert" ] && [ -s "$key" ] || fail 'Mount both fullchain.pem and privkey.pem'
else
    # Local development fallback only; production should mount a real certificate.
    mkdir -p /var/lib/postfix/tls
    cert=/var/lib/postfix/tls/fullchain.pem
    key=/var/lib/postfix/tls/privkey.pem
    if [ ! -s "$cert" ] || [ ! -s "$key" ]; then
        (umask 077; openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
            -subj "/CN=$POSTFIX_HOSTNAME" \
            -addext "subjectAltName=DNS:$POSTFIX_HOSTNAME" \
            -keyout "$key" -out "$cert" >/dev/null 2>&1) \
            || fail 'Unable to generate the local TLS certificate'
    fi
    chown postfix:postfix /var/lib/postfix/tls "$cert" "$key"
    chmod 0700 /var/lib/postfix/tls
    chmod 0600 "$key"
    printf '%s\n' 'Using a local self-signed TLS certificate; mount a real certificate for production.' >&2
fi
postconf -e "smtpd_tls_cert_file = $cert"
postconf -e "smtpd_tls_key_file = $key"

# Named volumes survive restarts; check also creates missing queue directories.
postfix check
exec "$@"
