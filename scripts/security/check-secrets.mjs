import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const PRIVATE_KEY_FILE_NAMES = new Set([
  "id_rsa",
  "id_dsa",
  "id_ecdsa",
  "id_ed25519",
  "credentials.json",
  "service-account.json",
  "service-account-key.json",
]);
const PRIVATE_KEY_EXTENSIONS = new Set([
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".jks",
  ".keystore",
]);
const SECRET_PATTERNS = [
  {
    name: "private key material",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "AWS access key",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  },
  {
    name: "Google API key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    name: "GitHub token",
    pattern: /\bgh[pousr]_[0-9A-Za-z]{36,255}\b/,
  },
  {
    name: "GitHub fine-grained token",
    pattern: /\bgithub_pat_[0-9A-Za-z_]{80,255}\b/,
  },
  {
    name: "OpenAI API key",
    pattern: /\bsk-(?:proj-)?[0-9A-Za-z_-]{20,}\b/,
  },
  {
    name: "Slack token",
    pattern: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/,
  },
  {
    name: "Stripe secret key",
    pattern: /\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{16,}\b/,
  },
];

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

export function sensitiveFileReason(filePath) {
  const normalizedPath = normalizePath(filePath);
  const fileName = basename(normalizedPath).toLowerCase();
  const extension = extname(fileName);

  if ((fileName === ".env" || fileName.startsWith(".env.")) && !fileName.endsWith(".example")) {
    return "environment secret file";
  }
  if (PRIVATE_KEY_FILE_NAMES.has(fileName)) {
    return "credential or private key file";
  }
  if (PRIVATE_KEY_EXTENSIONS.has(extension)) {
    return "credential or private key file";
  }
  return null;
}

export function findSecretMatches(text) {
  const findings = [];
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    for (const secretPattern of SECRET_PATTERNS) {
      if (secretPattern.pattern.test(lines[index])) {
        findings.push({
          line: index + 1,
          rule: secretPattern.name,
        });
      }
    }
  }
  return findings;
}

export function findUnpinnedActionReferences(text) {
  const findings = [];
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*uses:\s*([^\s#]+)@([^\s#]+)/);
    if (!match || match[1].startsWith("./") || match[1].startsWith("docker://")) {
      continue;
    }
    if (!/^[0-9a-f]{40}$/i.test(match[2])) {
      findings.push({
        line: index + 1,
        rule: "GitHub Action is not pinned to a full commit SHA",
      });
    }
  }
  return findings;
}

function repositoryFiles(repositoryRoot) {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: repositoryRoot },
  );
  return [...new Set(output.toString("utf8").split("\0").filter(Boolean))];
}

function isReadableTextFile(absolutePath) {
  const stats = lstatSync(absolutePath);
  if (!stats.isFile() || stats.size > MAX_FILE_BYTES) {
    return false;
  }
  const contents = readFileSync(absolutePath);
  return !contents.includes(0);
}

export function scanRepository(repositoryRoot) {
  const findings = [];
  let inspectedTextFiles = 0;

  for (const filePath of repositoryFiles(repositoryRoot)) {
    const normalizedPath = normalizePath(filePath);
    const pathFinding = sensitiveFileReason(normalizedPath);
    if (pathFinding) {
      findings.push({ file: normalizedPath, line: null, rule: pathFinding });
      continue;
    }

    const absolutePath = resolve(repositoryRoot, filePath);
    try {
      if (!isReadableTextFile(absolutePath)) {
        continue;
      }
      inspectedTextFiles += 1;
      const text = readFileSync(absolutePath, "utf8");
      for (const finding of findSecretMatches(text)) {
        findings.push({ file: normalizedPath, ...finding });
      }
      if (/^\.github\/workflows\/.*\.ya?ml$/i.test(normalizedPath)) {
        for (const finding of findUnpinnedActionReferences(text)) {
          findings.push({ file: normalizedPath, ...finding });
        }
      }
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return { findings, inspectedTextFiles };
}

function main() {
  const repositoryRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
  const result = scanRepository(repositoryRoot);

  if (result.findings.length > 0) {
    console.error(`Secret hygiene check failed with ${result.findings.length} finding(s):`);
    for (const finding of result.findings) {
      const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
      console.error(`- ${location}: ${finding.rule}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Secret hygiene check passed (${result.inspectedTextFiles} text files inspected).`);
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (entryPoint === import.meta.url) {
  main();
}
