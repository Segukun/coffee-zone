import api from './apiClient.js';

export function createUsersApi(client = api) {
  return {
    getMe: options => client.get('/users/me', { ...options, auth: true }),
    getPublicProfile: (username, options) => client.get('/users/' + encodeURIComponent(username), { ...options, auth: false }),
    updateMe: (data, options) => client.patch('/users/me', data, { ...options, auth: true }),
    changePassword: (data, options) => client.patch('/users/me/password', data, { ...options, auth: true }),
  };
}

export default createUsersApi();
