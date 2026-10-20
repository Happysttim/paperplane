#!/bin/sh
set -eu

# Windows bind mount의 권한과 무관하게 런타임 키를 전용 사용자만 읽도록 합니다.
test -s /run/secrets/dkim.private || {
    printf '%s\n' 'Missing DKIM private key: mount dkim/mail202610.private' >&2
    exit 1
}
openssl rsa -in /run/secrets/dkim.private -check -noout >/dev/null 2>&1 || {
    printf '%s\n' 'DKIM key must be an unencrypted RSA private key' >&2
    exit 1
}
install -d -m 0700 -o opendkim -g opendkim /run/opendkim
install -m 0600 -o opendkim -g opendkim /run/secrets/dkim.private /run/opendkim/mail202610.private
# 키를 생성하거나 교체하지 않고 기존 DNS 공개키와 짝인 키를 사용합니다.
exec opendkim -f -x /etc/opendkim.conf
