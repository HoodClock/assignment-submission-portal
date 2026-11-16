const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const SUBMISSIONS_FILE = path.join(__dirname, '..', 'submissions.json');
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const PORT = process.env.PORT || 3000;

function loadSubmissions() {
  try {
    return JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
}

let submissions = loadSubmissions();

function persistSubmissions() {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
}

function resetSubmissions() {
  submissions = [];
  persistSubmissions();
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

app.post('/api/submissions', (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const registrationNumber = typeof body.registrationNumber === 'string' ? body.registrationNumber.trim() : '';
  const assignmentTitle = typeof body.assignmentTitle === 'string' ? body.assignmentTitle.trim() : '';
  const submissionUrl = typeof body.submissionUrl === 'string' ? body.submissionUrl.trim() : '';

  const errors = {};
  if (!name) errors.name = 'Name is required.';
  if (!registrationNumber) errors.registrationNumber = 'Registration number is required.';
  if (!assignmentTitle) errors.assignmentTitle = 'Assignment title is required.';
  if (!submissionUrl || !isValidHttpUrl(submissionUrl)) errors.submissionUrl = 'Submission URL must be a valid http(s) URL.';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ ok: false, errors });
  }

  const submission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    registrationNumber,
    assignmentTitle,
    submissionUrl,
    submittedAt: new Date().toISOString(),
  };
  submissions.push(submission);
  persistSubmissions();
  return res.status(201).json({ ok: true, submission });
});

app.get('/api/submissions', (req, res) => {
  res.json(submissions);
});

app.use(express.static(CLIENT_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Assignment submission portal listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
module.exports.resetSubmissions = resetSubmissions;
