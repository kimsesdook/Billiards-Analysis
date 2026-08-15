import assert from "node:assert/strict";
import test from "node:test";

import {
  findSecretMatches,
  findUnpinnedActionReferences,
  sensitiveFileReason,
} from "./check-secrets.mjs";

test("detects high-confidence secret formats without exposing their values", () => {
  const samples = [
    "-----BEGIN " + "PRIVATE KEY-----",
    "AK" + "IA" + "A".repeat(16),
    "AI" + "za" + "A".repeat(35),
    "gh" + "p_" + "A".repeat(36),
    "sk-" + "A".repeat(24),
    "xox" + "b-" + "A".repeat(16),
    "sk_" + "live_" + "A".repeat(20),
  ];

  for (const sample of samples) {
    assert.equal(findSecretMatches(`secret=${sample}`).length, 1);
  }
});

test("allows environment placeholders and documentation examples", () => {
  const safeConfiguration = [
    "GEMINI_API_KEY=${GEMINI_API_KEY:}",
    "DB_PASSWORD=your_password",
    "OPENAI_API_KEY=<set-in-terminal>",
  ].join("\n");

  assert.deepEqual(findSecretMatches(safeConfiguration), []);
});

test("rejects sensitive filenames while allowing example templates", () => {
  assert.equal(sensitiveFileReason(".env"), "environment secret file");
  assert.equal(sensitiveFileReason("Backend/.env.local"), "environment secret file");
  assert.equal(sensitiveFileReason("certificates/server.pem"), "credential or private key file");
  assert.equal(sensitiveFileReason("credentials.json"), "credential or private key file");
  assert.equal(sensitiveFileReason("Frontend/.env.example"), null);
  assert.equal(sensitiveFileReason("Frontend/src/keyboard.ts"), null);
});

test("requires external GitHub Actions to use full commit SHAs", () => {
  const commitSha = "a".repeat(40);

  assert.equal(findUnpinnedActionReferences("uses: actions/checkout@v4").length, 1);
  assert.deepEqual(
    findUnpinnedActionReferences(`uses: actions/checkout@${commitSha} # v4`),
    [],
  );
  assert.deepEqual(findUnpinnedActionReferences("uses: ./local-action"), []);
});
