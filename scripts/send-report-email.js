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
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const to = process.env.REPORT_EMAIL_TO;
  if (!apiKey || !domain || !to) {
    console.log('Email report skipped: MAILGUN_API_KEY, MAILGUN_DOMAIN or REPORT_EMAIL_TO is not configured');
    return;
  }
  const resultsPath = process.env.JEST_RESULTS_FILE || 'test-results.json';
  const jestResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const tests = flattenTests(jestResults);
  const passed = tests.filter((t) => t.status === 'passed').length;
  const failed = tests.filter((t) => t.status === 'failed').length;
  const status = failed > 0 ? 'failed' : 'passed';

  const lines = [
    `Assignment Portal Test Report`,
    ``,
    `Overall status: ${status.toUpperCase()}`,
    `Commit: ${process.env.GITHUB_SHA || 'unknown'}`,
    `Branch: ${process.env.GITHUB_REF_NAME || 'unknown'}`,
    `Pipeline run: ${process.env.GITHUB_RUN_ID || 'unknown'}`,
    `Execution timestamp: ${new Date().toISOString()}`,
    ``,
    `Test counts -> Total: ${tests.length}, Passed: ${passed}, Failed: ${failed}`,
    ``,
    `Individual test results:`,
    ...tests.map((t) => `- ${t.status.toUpperCase()}: ${t.name}` + (t.failureMessage ? `\n  Failure: ${t.failureMessage}` : '')),
  ];

  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      from: `CI <noreply@${domain}>`,
      to,
      subject: `Assignment Portal Test Report: ${status.toUpperCase()}`,
      text: lines.join('\n'),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Failed to send email report: ${res.status} ${body}`);
    process.exit(1);
  }
  console.log('Test report emailed');
}

main();
