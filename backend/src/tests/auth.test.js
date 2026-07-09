const request = require('supertest');
const { app, prisma } = require('../index');

describe('Auth Endpoints', () => {
  const testUser = {
    username: `testuser_${Date.now()}`,
    displayName: 'Test User',
    email: `test_${Date.now()}@example.com`,
    password: 'password123'
  };

  afterAll(async () => {
    // Cleanup
    await prisma.session.deleteMany({ where: { user: { email: testUser.email } } });
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.user).toHaveProperty('email', testUser.email);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should not register user with duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error', 'Username already in use');
  });

  it('should login successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        login: testUser.email,
        password: testUser.password
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.user).toHaveProperty('email', testUser.email);
    
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.includes('refreshToken='))).toBeTruthy();
    expect(cookies.some(c => c.includes('token='))).toBeTruthy();
  });
  
  it('should fail login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        login: testUser.email,
        password: 'wrongpassword'
      });
    
    expect(res.statusCode).toEqual(401);
  });
});
