function matchPathExists(paths, matcher) {
  if (typeof matcher === 'string') {
    return paths.some((p) => p === matcher);
  }
  return paths.some((p) => matcher.test(p));
}

function detectTools({ filePaths, deps = [] }) {
  const tools = new Set();
  const has = (m) => matchPathExists(filePaths, m);

  if (has(/^Dockerfile$/i) || has(/^docker-compose/i) || has(/^compose\.(ya?ml)$/i)) tools.add('docker');
  if (has(/schema\.prisma$/) || has('prisma/schema.prisma') || (deps.prisma || deps['@prisma/client'])) tools.add('prisma');
  if (has('package.json')) {
    tools.add('npm');
    if (deps.react || deps['react-native']) tools.add('react');
    if (deps['react-native']) tools.add('react-native');
    if (deps.next) tools.add('next');
    if (deps.express) tools.add('express');
    if (deps.tailwindcss) tools.add('tailwind');
    if (deps.typeorm) tools.add('typeorm');
    if (deps.mongoose || deps.mongodb) tools.add('mongodb');
  }
  if (has(/^(requirements.*\.txt|pyproject\.toml|setup\.py)$/)) tools.add('python');
  if (has('go.mod')) tools.add('go');
  if (has(/^Cargo\.toml$/)) tools.add('rust');
  if (has(/\.csproj$/)) tools.add('.net');
  if (has('Gemfile') || has(/\.rb$/)) tools.add('ruby');
  if (has('composer.json')) tools.add('php');
  if (has(/\.java$/)) tools.add('java');
  if (has(/\.swift$/)) tools.add('swift');
  if (has(/\.kt$/)) tools.add('kotlin');
  if (has(/\.sql$/)) tools.add('sql');
  if (has(/^Makefile$/)) tools.add('make');
  if (has(/\.ts(x|)$/) || has('tsconfig.json')) tools.add('typescript');
  if (has(/\.scss$/)) tools.add('sass');

  return [...tools];
}

const SPECIES_BY_LANGUAGE = {
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  python: 'python',
  py: 'python',
  html: 'html',
  css: 'css',
  scss: 'css',
  java: 'java',
  c: 'c',
  cpp: 'c',
  'c#': 'csharp',
  go: 'go',
  rust: 'rust',
  ruby: 'ruby',
  php: 'php',
  swift: 'swift',
  kotlin: 'kotlin',
  sql: 'sql',
};

function speciesFromLanguage(language) {
  if (!language) return 'egg';
  return SPECIES_BY_LANGUAGE[language.toLowerCase()] || 'egg';
}

async function readPackageDeps(token, fullName, branch) {
  try {
    const contents = await (await fetch(`https://api.github.com/repos/${fullName}/contents/package.json?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'tamagit-backend',
        Accept: 'application/vnd.github+json',
      },
    })).json();
    if (!contents.content) return {};
    const parsed = JSON.parse(Buffer.from(contents.content, 'base64').toString('utf8'));
    return { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };
  } catch {
    return {};
  }
}

module.exports = { detectTools, speciesFromLanguage, readPackageDeps };