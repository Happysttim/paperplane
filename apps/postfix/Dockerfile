FROM debian:bookworm-slim

# Install the distribution-maintained Postfix package without starting services.
RUN printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d \
    && chmod +x /usr/sbin/policy-rc.d \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        postfix postfix-pgsql ca-certificates openssl netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY config/main.cf /etc/postfix/main.cf
COPY config/master.cf /etc/postfix/master.cf
COPY config/pgsql/ /etc/postfix/pgsql-templates/
COPY docker-entrypoint.sh /usr/local/bin/paperplane-postfix

# Windows checkouts must not put CRLF into the Linux entrypoint.
RUN sed -i 's/\r$//' /usr/local/bin/paperplane-postfix \
    && chmod 0755 /usr/local/bin/paperplane-postfix \
    && newaliases

EXPOSE 25 10025 10027
STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/local/bin/paperplane-postfix"]
CMD ["postfix", "start-fg"]
