import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const args = new Set(process.argv.slice(2));
const full = args.has('--full') || (!args.has('--quick') && !args.has('--live'));
const live = args.has('--live');
const workspace = process.cwd();
const appDir = path.basename(workspace).toLowerCase() === 'app' ? workspace : path.join(workspace, 'app');
const reportDir = path.join(appDir, 'test-results');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const checks = [
  { name: 'lint', command: npm, args: ['run', 'lint'] },
  { name: 'typecheck', command: npm, args: ['run', 'typecheck'] },
  { name: 'unit', command: npm, args: ['test'] },
];

if (full) {
  checks.push(
    { name: 'e2e', command: npm, args: ['run', 'test:e2e'] },
    { name: 'build', command: npm, args: ['run', 'build'] },
    { name: 'audit', command: npm, args: ['audit', '--omit=dev'] },
  );
}

if (live) {
  checks.push({
    name: 'live-ai', command: npx, args: ['playwright', 'test', 'tests/e2e/live-ai.spec.ts'],
    env: { RUN_LIVE_AI: '1' },
  });
}

const secretPatterns = [
  { pattern: /AQ\.[A-Za-z0-9_-]{20,}/g, replacement: '[REDACTED]' },
  { pattern: /(?:sb_secret_|sk-ant-|gsk_|AIza)[A-Za-z0-9_-]+/g, replacement: '[REDACTED]' },
  { pattern: /Bearer\s+[A-Za-z0-9._-]+/gi, replacement: 'Bearer [REDACTED]' },
  { pattern: /((?:API_KEY|PASSWORD|SECRET|TOKEN)\s*[=:]\s*)\S+/gi, replacement: '$1[REDACTED]' },
];

function sanitize(value) {
  return secretPatterns.reduce((text, item) => text.replace(item.pattern, item.replacement), value);
}

function run(check) {
  return new Promise(resolve => {
    const started = Date.now();
    const onWindows = process.platform === 'win32';
    const command = onWindows ? (process.env.ComSpec || 'cmd.exe') : check.command;
    const commandArgs = onWindows ? ['/d', '/s', '/c', [check.command, ...check.args].join(' ')] : check.args;
    const child = spawn(command, commandArgs, {
      cwd: appDir,
      env: { ...process.env, ...check.env },
      shell: false,
      windowsHide: true,
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; process.stdout.write(chunk); });
    child.stderr.on('data', chunk => { output += chunk; process.stderr.write(chunk); });
    child.on('error', error => resolve({ name: check.name, exitCode: 1, durationMs: Date.now() - started, output: sanitize(error.message) }));
    child.on('close', code => resolve({ name: check.name, exitCode: code ?? 1, durationMs: Date.now() - started, output: sanitize(output).slice(-12000) }));
  });
}

const results = [];
for (const check of checks) results.push(await run(check));

await mkdir(reportDir, { recursive: true });
const generatedAt = new Date().toISOString();
const passed = results.every(result => result.exitCode === 0);
const report = { generatedAt, mode: live ? 'live' : full ? 'full' : 'quick', passed, results };
await writeFile(path.join(reportDir, 'flow-qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);

const markdown = [
  '# Email Builder QA report',
  '',
  `- Generated: ${generatedAt}`,
  `- Mode: ${report.mode}`,
  `- Result: ${passed ? 'PASS' : 'FAIL'}`,
  '',
  '| Check | Result | Duration |',
  '| --- | --- | ---: |',
  ...results.map(result => `| ${result.name} | ${result.exitCode === 0 ? 'PASS' : 'FAIL'} | ${(result.durationMs / 1000).toFixed(1)}s |`),
  '',
  ...results.filter(result => result.exitCode !== 0).flatMap(result => [
    `## ${result.name} failure`, '', '```text', result.output || '(no output)', '```', '',
  ]),
].join('\n');
await writeFile(path.join(reportDir, 'flow-qa-report.md'), `${markdown}\n`);

console.log(`\nQA report: ${path.join(reportDir, 'flow-qa-report.md')}`);
process.exitCode = passed ? 0 : 1;
