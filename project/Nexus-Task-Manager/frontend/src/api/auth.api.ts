import client from './client';

export const authApi = {
  signup: (data: { fullName: string; email: string; password: string }) =>
    client.post('/auth/signup', data),
  login: (data: { email: string; password: string }) =>
    client.post('/auth/login', data),
  refresh: (refreshToken: string) =>
    client.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) =>
    client.post('/auth/logout', { refreshToken }),
  getMe: () => client.get('/auth/me'),
  updateMe: (data: { fullName?: string; focus?: string }) =>
    client.patch('/auth/me', data),
  forgotRequest: (email: string) =>
    client.post('/auth/forgot/request', { email }),
  forgotVerify: (email: string, otp: string) =>
    client.post('/auth/forgot/verify', { email, otp }),
  forgotReset: (resetToken: string, newPassword: string) =>
    client.post('/auth/forgot/reset', { resetToken, newPassword }),
};
