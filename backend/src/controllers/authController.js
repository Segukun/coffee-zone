import { loginUser, registerUser } from '../services/authService.js';

export async function register(request, response) {
  const data = await registerUser(request.body);
  response.status(201).json({ data });
}

export async function login(request, response) {
  const data = await loginUser(request.body);
  response.set('Cache-Control', 'no-store').status(200).json({ data });
}
