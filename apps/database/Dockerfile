FROM postgres:18-bookworm

# 공식 이미지의 최초 초기화 과정에서 서비스 계정과 권한을 생성합니다.
COPY init/ /docker-entrypoint-initdb.d/
COPY scripts/ /opt/paperplane/
RUN sed -i 's/\r$//' /docker-entrypoint-initdb.d/*.sh \
    && chmod 0755 /docker-entrypoint-initdb.d/*.sh
