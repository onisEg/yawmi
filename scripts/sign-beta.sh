#!/usr/bin/env bash
# Sign Yawmi's unsigned beta APK using a user-owned PRIVATE keystore.
# Never commit, log, or distribute the keystore/password with the APK.
set -euo pipefail

UNSIGNED_APK="${1:?Usage: scripts/sign-beta.sh UNSIGNED_APK SIGNED_APK}"
SIGNED_APK="${2:?Usage: scripts/sign-beta.sh UNSIGNED_APK SIGNED_APK}"
: "${YAWMI_BETA_KEYSTORE:?Point to the existing private beta .jks/.p12 file}"
: "${YAWMI_BETA_KEY_PASSWORD:?Set keystore password as an environment secret}"
: "${YAWMI_BETA_KEY_ALIAS:?Set the existing keystore alias}"
: "${APK_SIGNER_JAR:?Point to an Android SDK build-tools apksigner.jar}"

test -s "$UNSIGNED_APK"
test -s "$YAWMI_BETA_KEYSTORE"
test -s "$APK_SIGNER_JAR"
# Never write secret values into subprocess args; apksigner reads them from env.
java -jar "$APK_SIGNER_JAR" sign \
  --ks "$YAWMI_BETA_KEYSTORE" \
  --ks-key-alias "$YAWMI_BETA_KEY_ALIAS" \
  --ks-pass env:YAWMI_BETA_KEY_PASSWORD \
  --key-pass env:YAWMI_BETA_KEY_PASSWORD \
  --out "$SIGNED_APK" "$UNSIGNED_APK"

java -jar "$APK_SIGNER_JAR" verify --verbose --print-certs \
  --min-sdk-version 24 "$SIGNED_APK"
printf 'Signed and verified: %s\n' "$SIGNED_APK"
