export const previewProfile = {
  name: 'Alex Morgan',
  username: 'alexcodes',
  avatarAccent: true,
  bio: 'Frontend developer in training. Building with React and plenty of coffee.\nLearning, sharing, and trying again.',
  location: 'Madrid, Spain',
  joinedAt: '2026-10-01T00:00:00Z',
  followingCount: 128,
  followersCount: 256,
};

const sofia = { name: 'Sofía Chen', username: 'sofiadev' };
const diego = { name: 'Diego Ruiz', username: 'diegobuilds' };
const sam = { name: 'Sam Taylor', username: 'sambuilds' };

export const homePosts = [
  {
    id: 'preview-sofia',
    author: sofia,
    createdAt: '2026-11-06T14:36:00Z',
    content: 'Less state, fewer problems. Before creating another useState, ask yourself if you can derive the value. This small change saved me a few bugs.',
    codeSnippet: {
      language: 'JavaScript',
      code: 'const completed = tasks.filter(task => task.done);\nconst progress = completed.length / tasks.length;',
    },
    likesCount: 42,
    isLiked: true,
    comments: [
      {
        id: 'sofia-derived-state',
        author: previewProfile,
        createdAt: '2026-11-06T14:42:00Z',
        content: 'I was keeping the filtered list in state too. This makes so much more sense! Would you use useMemo here?',
        likesCount: 6,
        comments: [
          {
            id: 'sofia-memo-reply',
            author: sofia,
            createdAt: '2026-11-06T14:48:00Z',
            content: 'Only if the calculation is expensive. For a small list, I would keep it simple and measure first.',
            likesCount: 4,
            comments: [
              {
                id: 'alex-memo-thanks',
                author: previewProfile,
                createdAt: '2026-11-06T14:51:00Z',
                content: 'Got it. Measure first, optimize later. Thanks for explaining!',
                likesCount: 2,
              },
            ],
          },
          {
            id: 'sam-memo-reply',
            author: sam,
            createdAt: '2026-11-06T14:50:00Z',
            content: 'The React DevTools profiler helped me figure out when memoization was actually useful.',
            likesCount: 3,
          },
        ],
      },
      {
        id: 'sofia-empty-list',
        author: diego,
        createdAt: '2026-11-06T14:45:00Z',
        content: 'Nice reminder! I would also handle the empty list so progress does not become NaN.',
        likesCount: 8,
        comments: [
          {
            id: 'sofia-empty-list-reply',
            author: sofia,
            createdAt: '2026-11-06T14:52:00Z',
            content: 'Good catch! tasks.length ? completed.length / tasks.length : 0 would cover that.',
            likesCount: 5,
          },
        ],
      },
      {
        id: 'sofia-small-changes',
        author: sam,
        createdAt: '2026-11-06T14:55:00Z',
        content: 'Small changes like this make a big difference. Saving this reminder for my next project. #ReactJS',
        likesCount: 3,
      },
    ],
  },
  {
    id: 'preview-alex',
    author: previewProfile,
    createdAt: '2026-11-06T14:00:00Z',
    content: 'My first React + Vite project is up and running.\nToday I learned that small components make everything easier. One step, one commit at a time.\n\n#BuildInPublic #ReactJS',
    likesCount: 24,
    comments: [
      {
        id: 'alex-congratulations',
        author: sofia,
        createdAt: '2026-11-06T14:08:00Z',
        content: 'Congratulations on getting it running! What are you planning to build next?',
        likesCount: 5,
        comments: [
          {
            id: 'alex-next-project',
            author: previewProfile,
            createdAt: '2026-11-06T14:12:00Z',
            content: 'A little space to share what I am learning. Starting with the interface and taking it step by step.',
            likesCount: 3,
          },
        ],
      },
      {
        id: 'alex-first-step',
        author: diego,
        createdAt: '2026-11-06T14:15:00Z',
        content: 'That first working project feels amazing. Keep going! #BuildInPublic',
        likesCount: 4,
      },
    ],
  },
  {
    id: 'preview-diego',
    author: diego,
    createdAt: '2026-11-06T13:00:00Z',
    content: 'Today I made my first pull request to an open source project. It was a documentation change, but it felt huge. If you are just getting started, small contributions count too.\n\n#FirstCommit #OpenSource',
    likesCount: 36,
    comments: [
      {
        id: 'diego-documentation',
        author: sam,
        createdAt: '2026-11-06T13:10:00Z',
        content: 'Documentation is a real contribution. Someone will have an easier time getting started because of your work.',
        likesCount: 7,
      },
      {
        id: 'diego-first-pr',
        author: previewProfile,
        createdAt: '2026-11-06T13:18:00Z',
        content: 'This is the encouragement I needed to try my first PR too. Congrats!',
        likesCount: 5,
      },
    ],
  },
];

export const profilePosts = [
  {
    id: 'profile-first-project',
    author: previewProfile,
    createdAt: '2026-10-09T12:00:00Z',
    content: 'My first React + Vite project is up and running.\nToday I learned that small components make everything easier. One step, one commit at a time.\n\n#BuildInPublic #ReactJS',
    likesCount: 24,
    comments: [
      {
        id: 'profile-project-start',
        author: sofia,
        createdAt: '2026-10-09T12:20:00Z',
        content: 'Welcome to React! Small components are a great place to start.',
        likesCount: 4,
      },
      {
        id: 'profile-project-coffee',
        author: diego,
        createdAt: '2026-10-09T12:30:00Z',
        content: 'One step, one commit, one coffee. You have got this!',
        likesCount: 3,
      },
    ],
  },
  {
    id: 'profile-first-hook',
    author: previewProfile,
    createdAt: '2026-10-08T12:00:00Z',
    content: 'A small reminder: you do not need to know everything to get started. This was my first custom hook. What would you improve?',
    codeSnippet: {
      language: 'JavaScript',
      code: 'function useToggle(initial = false) {\n  const [value, setValue] = useState(initial);\n  return [value, () => setValue(v => !v)];\n}',
    },
    likesCount: 18,
    comments: [
      {
        id: 'profile-hook-feedback',
        author: sam,
        createdAt: '2026-10-08T12:15:00Z',
        content: 'Nice use of the functional update! I would start by testing the initial value and a couple of toggles.',
        likesCount: 5,
        comments: [
          {
            id: 'profile-hook-thanks',
            author: previewProfile,
            createdAt: '2026-10-08T12:22:00Z',
            content: 'Thank you! Testing both initial values is going on my list.',
            likesCount: 2,
          },
        ],
      },
    ],
  },
];
