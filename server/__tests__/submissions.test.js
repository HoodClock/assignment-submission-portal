const request = require('supertest');
const app = require('../index');

describe('Assignment submission portal', () => {
  beforeEach(() => {
    app.resetSubmissions();
  });

  test('saves a complete submission with a valid URL and lists it', async () => {
    const postRes = await request(app).post('/api/submissions').send({
      name: 'Jane Student',
      registrationNumber: 'REG-2026-001',
      assignmentTitle: 'Data Structures Homework',
      submissionUrl: 'https://github.com/jane/student-repo',
    });
    expect(postRes.status).toBe(201);
    expect(postRes.body.ok).toBe(true);

    const listRes = await request(app).get('/api/submissions');
    expect(listRes.status).toBe(200);
    const saved = listRes.body.find((s) => s.registrationNumber === 'REG-2026-001');
    expect(saved).toBeDefined();
    expect(saved.name).toBe('Jane Student');
    expect(saved.assignmentTitle).toBe('Data Structures Homework');
    expect(saved.submissionUrl).toBe('https://github.com/jane/student-repo');
  });

  test('rejects a submission missing the registration number', async () => {
    const postRes = await request(app).post('/api/submissions').send({
      name: 'John Student',
      assignmentTitle: 'Algorithms Lab',
      submissionUrl: 'https://github.com/john/student-repo',
    });
    expect(postRes.status).toBe(400);
    expect(postRes.body.ok).toBe(false);
    expect(postRes.body.errors).toBeDefined();
    expect(postRes.body.errors.registrationNumber).toBeDefined();

    const listRes = await request(app).get('/api/submissions');
    const saved = listRes.body.find((s) => s.registrationNumber === 'REG-2026-002');
    expect(saved).toBeUndefined();
  });

  test('rejects a submission with an invalid URL and does not save it', async () => {
    const postRes = await request(app).post('/api/submissions').send({
      name: 'John Student',
      registrationNumber: 'REG-2026-002',
      assignmentTitle: 'Algorithms Lab',
      submissionUrl: 'not-a-valid-url',
    });
    expect(postRes.status).toBe(400);
    expect(postRes.body.ok).toBe(false);
    expect(postRes.body.errors).toBeDefined();
    expect(postRes.body.errors.submissionUrl).toBeDefined();

    const listRes = await request(app).get('/api/submissions');
    const saved = listRes.body.find((s) => s.registrationNumber === 'REG-2026-002');
    expect(saved).toBeUndefined();
  });
});
