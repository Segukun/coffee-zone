import { homePosts, previewProfile, profilePosts } from '../utils/previewPosts.js';

export function findThread(posts, postId, commentId) {
  const post = posts.find(item => item.id === postId);
  if (!post) return null;
  if (!commentId) return { post, selected: post, parent: null };
  function find(comments, parent) {
    for (const comment of comments) {
      if (comment.id === commentId) return { post, selected: comment, parent };
      const match = find(comment.comments ?? [], comment);
      if (match) return match;
    }
    return null;
  }
  return find(post.comments ?? [], post);
}

function mapItems(items, transform) {
  return items.map(item => transform({ ...item, comments: mapItems(item.comments ?? [], transform) }));
}

function findItem(items, id) {
  for (const item of items) {
    if (item.id === id) return item;
    const match = findItem(item.comments ?? [], id);
    if (match) return match;
  }
}

export function createLocalServices() {
  let snapshot = structuredClone({ profile: previewProfile, posts: [...homePosts, ...profilePosts] });
  const listeners = new Set();
  const ownedUrls = new Set();

  function createUrl(file, kind) {
    const url = URL.createObjectURL(kind === 'image' ? file : new Blob([file], { type: 'application/octet-stream' }));
    ownedUrls.add(url);
    return url;
  }

  function saveAttachments(attachments = []) {
    return attachments.map(attachment => {
      if (!attachment.file) return attachment;
      const { id, name, size, type, kind, file } = attachment;
      return { id, name, size, type, kind, url: createUrl(file, kind) };
    });
  }

  function publish(next) {
    snapshot = next;
    const activeUrls = new Set([next.profile.avatarUrl, next.profile.bannerUrl]);
    function collect(items) {
      for (const item of items) {
        for (const attachment of item.attachments ?? []) activeUrls.add(attachment.url);
        collect(item.comments ?? []);
      }
    }
    collect(next.posts);
    for (const url of ownedUrls) {
      if (!activeUrls.has(url)) {
        URL.revokeObjectURL(url);
        ownedUrls.delete(url);
      }
    }
    for (const listener of listeners) listener();
  }

  function postFields(values) {
    if (!values.content.trim() && !values.codeSnippet?.code.trim() && !values.attachments?.length) {
      throw new Error('Add text, code or an attachment before posting.');
    }
    return {
      content: values.content,
      codeSnippet: values.codeSnippet?.code.trim() ? values.codeSnippet : undefined,
      attachments: saveAttachments(values.attachments),
    };
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async createPost(values) {
      const post = {
        ...postFields(values),
        id: crypto.randomUUID(),
        author: snapshot.profile,
        createdAt: new Date().toISOString(),
        likesCount: 0,
        isLiked: false,
        comments: [],
      };
      publish({ ...snapshot, posts: [post, ...snapshot.posts] });
      return post;
    },
    async updatePost(id, values) {
      const post = findItem(snapshot.posts, id);
      if (!post) throw new Error('This post is no longer available.');
      if (post.author.id !== snapshot.profile.id) throw new Error('You can only edit your own posts.');
      const fields = postFields(values);
      publish({ ...snapshot, posts: mapItems(snapshot.posts, item => item.id === id ? { ...item, ...fields, editedAt: new Date().toISOString() } : item) });
    },
    async addComment(parentId, values) {
      if (!findItem(snapshot.posts, parentId)) throw new Error('This conversation is no longer available.');
      const comment = {
        ...postFields(values),
        id: crypto.randomUUID(),
        author: snapshot.profile,
        createdAt: new Date().toISOString(),
        likesCount: 0,
        isLiked: false,
        comments: [],
      };
      publish({ ...snapshot, posts: mapItems(snapshot.posts, item => item.id === parentId ? { ...item, comments: [...item.comments, comment] } : item) });
      return comment;
    },
    async toggleLike(id) {
      if (!findItem(snapshot.posts, id)) throw new Error('This post is no longer available.');
      publish({ ...snapshot, posts: mapItems(snapshot.posts, item => item.id === id ? { ...item, isLiked: !item.isLiked, likesCount: item.likesCount + (item.isLiked ? -1 : 1) } : item) });
    },
    async updateProfile(values) {
      const { avatarFile, bannerFile, ...details } = values;
      const profile = {
        ...snapshot.profile,
        ...details,
        avatarUrl: avatarFile ? createUrl(avatarFile, 'image') : details.avatarUrl ?? snapshot.profile.avatarUrl,
        bannerUrl: bannerFile ? createUrl(bannerFile, 'image') : details.bannerUrl ?? snapshot.profile.bannerUrl,
      };
      publish({ profile, posts: mapItems(snapshot.posts, item => item.author.id === profile.id ? { ...item, author: profile } : item) });
      return profile;
    },
    dispose() {
      for (const url of ownedUrls) URL.revokeObjectURL(url);
      ownedUrls.clear();
    },
  };
}
