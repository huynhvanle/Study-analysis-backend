#!/usr/bin/env bash
# Chạy backend + phục vụ FE (frontend được copy vào classpath khi compile).
# Yêu cầu: MySQL đã chạy, database identity_service (hoặc chỉnh trong application.yaml).
set -e
cd "$(dirname "$0")"

if [[ -x "./mvnw" ]]; then
  MVN="./mvnw"
else
  MVN="mvn"
fi

if command -v /usr/libexec/java_home >/dev/null 2>&1; then
  if [[ -z "${JAVA_HOME:-}" ]]; then
    export JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home -v 21 2>/dev/null || true)"
  fi
fi

echo "Using JAVA_HOME=${JAVA_HOME:-system default}"
echo "Compiling (copy frontend → classpath)…"
$MVN -q clean compile -DskipTests

PORT="${SERVER_PORT:-8081}"
echo "Starting Spring Boot…"
echo "  → Giao diện:    http://localhost:${PORT}/study-analysis/"
echo "  → API ví dụ:    http://localhost:${PORT}/study-analysis/users"
echo ""

exec $MVN -q spring-boot:run
