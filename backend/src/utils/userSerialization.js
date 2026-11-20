export function serializeAccount(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio ?? '',
    avatar: user.avatar ?? '',
  };
}

export function serializeOwnProfile(user) {
  return { ...serializeAccount(user), createdAt: user.createdAt, updatedAt: user.updatedAt };
}

export function serializePublicProfile(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    username: user.username,
    bio: user.bio ?? '',
    avatar: user.avatar ?? '',
    createdAt: user.createdAt,
  };
}
