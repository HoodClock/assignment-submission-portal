const fs = require('fs');

function flattenTests(jestResults) {
  const tests = [];
  for (const suite of jestResults.testResults || []) {
    for (const t of suite.assertionResults || []) {
      tests.push({
        name: [t.ancestorTitles, t.title].filter(Boolean).join(' > '),
        status: t.status,
        failureMessage: (t.failureMessages || []).filter((m) => m && m.trim()).join('\n\n') || null,
      });
    }
  }
  return tests;
}

async function main() {
  const receiverUrl = process.env.REPORT_RECEIVER_URL;
  if (!receiverUrl) {
    console.error('REPORT_RECEIVER_URL is not configured');
    process.exit(1);
  }
  const resultsPath = process.env.JEST_RESULTS_FILE || 'test-results.json';
  const jestResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const tests = flattenTests(jestResults);
  const passed = tests.filter((t) => t.status === 'passed').length;
  const failed = tests.filter((t) => t.status === 'failed').length;
  const status = failed > 0 ? 'failed' : 'passed';

  const report = {
    repository: {
      name: process.env.GITHUB_REPOSITORY || 'unknown',
      branch: process.env.GITHUB_REF_NAME || 'unknown',
      commitSha: process.env.GITHUB_SHA || 'unknown',
    },
    pipeline: {
      runId: process.env.GITHUB_RUN_ID || 'unknown',
      runNumber: process.env.GITHUB_RUN_NUMBER || 'unknown',
      conclusion: status === 'failed' ? 'failure' : 'success',
    },
    executionTimestamp: new Date().toISOString(),
    summary: {
      total: tests.length,
      passed,
      failed,
      status,
    },
    tests,
  };

  const url = `${receiverUrl.replace(/\/$/, '')}/report`;
  const body = JSON.stringify(report);
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
        body,
      });
      if (res.ok) {
        console.log('Test report delivered to local receiver');
        return;
      }
      console.error(`Delivery attempt ${attempt}/${maxAttempts} failed with status ${res.status}`);
    } catch (err) {
      console.error(`Delivery attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
    }
    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 3000));
  }
  console.error('Failed to deliver test report to receiver after all attempts');
  process.exit(1);
}

main();
