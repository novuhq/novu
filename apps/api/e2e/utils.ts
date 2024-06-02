const faker = {
  phoneNumber: () =>
    `(${Math.floor(100 * Math.random()) + 100}) ${Math.floor(100 * Math.random()) + 100}-${
      Math.floor(10000 * Math.random()) + 10000
    }`,
  firstName: () => `John-${new Date().toISOString()}`,
  lastName: () => `Smith-${new Date().toISOString()}`,
  email: () => `Doe-Smith-${new Date().toISOString()}@gmail.com`,
  words: generateWords(),
  url: generateUrl(),
  jobTitle: jobTitle(),
};

function generateWords() {
  return (length: number | undefined) => {
    return Array.from({ length: length ?? 3 }, () => loremWords[Math.floor(Math.random() * loremWords.length)]).join(
      ' '
    );
  };
}

function jobTitle() {
  return () => {
    const prefixes = ['Senior', 'Lead', 'Junior', 'Assistant', 'Chief', 'Head'];
    const roles = ['Engineer', 'Developer', 'Manager', 'Analyst', 'Consultant', 'Specialist'];
    const domains = ['Software', 'Hardware', 'Network', 'Security', 'Data', 'Cloud'];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const role = roles[Math.floor(Math.random() * roles.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];

    return `${prefix} ${domain} ${role}`;
  };
}

function generateUrl() {
  return () => {
    const protocols = ['http', 'https'];
    const domains = ['example.com', 'test.com', 'site.com'];
    const paths = ['path', 'to', 'resource'];

    const protocol = protocols[Math.floor(Math.random() * protocols.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const path = Array.from({ length: 3 }, () => paths[Math.floor(Math.random() * paths.length)]).join('/');

    return `${protocol}://${domain}/${path}`;
  };
}

const loremWords = [
  'Lorem',
  'ipsum',
  'dolor',
  'sit',
  'amet',
  'consectetur',
  'adipiscing',
  'elit',
  'sed',
  'do',
  'eiusmod',
  'tempor',
  'incididunt',
  'ut',
  'labore',
  'et',
  'dolore',
  'magna',
  'aliqua',
  'Ut',
  'enim',
  'ad',
  'minim',
  'veniam',
  'quis',
  'nostrud',
  'exercitation',
  'ullamco',
  'laboris',
  'nisi',
  'ut',
  'aliquip',
  'ex',
  'ea',
  'commodo',
  'consequat',
  'Duis',
  'aute',
  'irure',
  'dolor',
  'in',
  'reprehenderit',
  'in',
  'voluptate',
  'velit',
  'esse',
  'cillum',
  'dolore',
  'eu',
  'fugiat',
  'nulla',
  'pariatur',
  'Excepteur',
  'sint',
  'occaecat',
  'cupidatat',
  'non',
  'proident',
  'sunt',
  'in',
  'culpa',
  'qui',
  'officia',
  'deserunt',
  'mollit',
  'anim',
  'id',
  'est',
  'laborum',
];
