import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync('.github/workflows/publish-signed-android-beta.yml','utf8');
const docs=readFileSync('docs/ANDROID_APK_PUBLIC_DISTRIBUTION.md','utf8');
test('publishing signed APK is a manual opt-in workflow, never a push action',()=>{
 assert.match(workflow,/^on:\s*\n\s+workflow_dispatch:/m);
 assert.doesNotMatch(workflow,/^\s+push:\s*$/m);
 assert.match(workflow,/environment: android-beta-release/);
 assert.match(workflow,/test "\$GITHUB_REF" = 'refs\/heads\/main'/);
});
test('release uses encrypted environment secrets and validates permanent new baseline certificate',()=>{
 for(const name of ['YAWMI_BETA_KEYSTORE_B64','YAWMI_BETA_KEY_PASSWORD','YAWMI_BETA_KEY_ALIAS']){
   assert.match(workflow,new RegExp('secrets\\.'+name));
 }
 assert.match(workflow,/EXPECTED_CERT_SHA256: "1d57e58ab6b46eccebdf4ae4e7ee2dd61bcd2674bd6466af74f267d66000001d"/);
 assert.match(workflow,/\$APKSIGNER" verify --verbose --print-certs/);
 assert.match(workflow,/grep -F -q "Signer #1 certificate SHA-256 digest: \$EXPECTED_CERT_SHA256"/);
 assert.match(workflow,/--ks-type PKCS12/);
});
test('APK is a compatible, monotonically-versioned Beta',()=>{
 assert.match(workflow,/version_code=2000\+int\(os\.environ\['GITHUB_RUN_NUMBER'\]\)/);
 assert.match(workflow,/1391 < version_code/);
 assert.match(workflow,/applicationId "in\.yawmi\.app\.beta"/);
 assert.match(workflow,/sha256sum/);
});
test('only a signed APK and checksum are published to official repository releases',()=>{
 assert.match(workflow,/GH_TOKEN: \$\{\{ github\.token \}\}/);
 assert.match(workflow,/gh release create "android-beta-v\$VERSION"/);
 assert.match(workflow,/release-android\/SHA256SUMS.txt/);
 assert.match(workflow,/--latest/);
 assert.doesNotMatch(workflow,/upload-artifact/);
 assert.match(docs,/no publicly published GitHub Releases/i);
});

test('signing source is audited and SHA-pinned to the tested APK-only main',()=>{
 const pinned='66c16c9f608dc8a430624d562658d0c3325989e5';
 assert.match(workflow,new RegExp('ref: '+pinned));
 assert.match(workflow,/git rev-parse HEAD/);
 assert.match(workflow,/persist-credentials: false/);
 assert.match(workflow,/--target "\$\(git rev-parse HEAD\)"/);
 assert.doesNotMatch(workflow,/--target "\$GITHUB_SHA"/);
 assert.match(docs,/pinned reviewed APK-only main commit/);
});
