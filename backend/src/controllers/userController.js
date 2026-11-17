import * as userService from '../services/userService.js';

export async function getMe(request, response) {
  const data = await userService.getOwnProfile(request.user.id);
  response.set('Cache-Control', 'no-store').json({ data });
}

export async function getPublic(request, response) {
  const data = await userService.getPublicProfile(request.params.username);
  response.json({ data });
}

export async function updateMe(request, response) {
  const data = await userService.updateOwnProfile(request.user.id, request.body);
  response.set('Cache-Control', 'no-store').json({ data });
}

export async function changePassword(request, response) {
  const data = await userService.changePassword(request.user.id, request.body);
  response.set('Cache-Control', 'no-store').status(200).json({ data });
}
