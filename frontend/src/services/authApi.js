import api from './apiClient.js';

export function createAuthApi(client = api) {
  return {
    register: (data, options) => client.post('/auth/register', data, { ...options, auth: false }),
    login: (data, options) => client.post('/auth/login', data, { ...options, auth: false }),
  };
}

export default createAuthApi();
