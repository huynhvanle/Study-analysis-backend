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
export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-dev}"

echo "Starting Spring Boot (profile=${SPRING_PROFILES_ACTIVE})…"
echo "  → Giao diện:    http://localhost:${PORT}/study-analysis/"
echo "  → API ví dụ:    http://localhost:${PORT}/study-analysis/users"
if [[ "${SPRING_PROFILES_ACTIVE}" == *"dev"* ]]; then
  echo ""
  echo "  Dev FE: sửa frontend/ → phục vụ trực tiếp từ đĩa, không cache HTTP."
  echo "  DevTools: đổi frontend/ có thể restart app + LiveReload (port 35729); tắt trong application-dev.yaml → spring.devtools.restart.enabled: false"
fi
echo ""

exec $MVN -q spring-boot:run
