const { githubFetch } = require('./githubApi');

const CONVENTIONAL_RE = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert|merge|deps):\s+.+/i;
const WIP_RE = /^(wip|fixup!|squash!|tmp|temporal|avance|borrador|.\s*$)/i;

function isTestFile(path) {
  return /(^|\/)(__tests__|test[s]?|spec)($|\/)|\.(test|spec)\./.test(path) || /\.(test|spec)\./.test(path || '');
}

function isConfigOrDocs(path) {
  return /^(\.[a-zA-Z0-9_]+|docs?\/|README|LICENSE|package(-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|\.github\/)/i.test(path || '');
}

function loadCommitDetails(token, fullName, branch) {
  return githubFetch(`/repos/${fullName}/commits?sha=${branch}&per_page=50`, token);
}

function scoreCommit(commit) {
  const files = commit.files || [];
  const stats = commit.stats || { additions: 0, deletions: 0 };
  const totalLines = (stats.additions || 0) + (stats.deletions || 0);
  const isMerge = (commit.parents || []).length > 1;
  const message = (commit.commit?.message || '').split('\n')[0] || '';
  const findings = [];

  let score = 50;

  if (CONVENTIONAL_RE.test(message)) {
    score += 15;
  } else if (WIP_RE.test(message)) {
    score -= 25;
    findings.push('Mensaje marca como trabajo en progreso (WIP/temporal)');
  } else if (message.length < 6) {
    score -= 10;
    findings.push('Mensaje de commit demasiado corto');
  }

  if (message.length >= 15 && message.length <= 120) {
    score += 8;
  }

  const testFiles = files.filter((f) => isTestFile(f.filename));
  if (testFiles.length > 0) {
    score += 10;
  } else if (files.length > 0 && files.every((f) => isConfigOrDocs(f.filename))) {
    score += 3;
  }

  if (totalLines === 0 && files.length === 0) {
    score -= 15;
    findings.push('Commit sin cambios de archivos, ambiguo');
  } else if (totalLines <= 400) {
    score += 8;
  } else if (totalLines > 1200) {
    score -= 15;
    findings.push(`Commit gigante (${totalLines} líneas). Mejor dividir en varios commits`);
  }

  if (isMerge) {
    score -= 5;
    findings.push('Commit de merge: revisa que no oculte conflictos');
  }

  if (files.length > 25) {
    score -= 10;
    findings.push(`Toca ${files.length} archivos a la vez`);
  }

  score = Math.max(0, Math.min(100, score));

  const summary =
    files.length > 0
      ? `${files.length} archivos, +${stats.additions || 0}/-${stats.deletions || 0} líneas. Tests: ${testFiles.length > 0 ? 'incluye' : 'sin tests'}.`
      : 'Sin detalles de archivos para este commit.';

  return { score, findings, summary, files: files.length, additions: stats.additions || 0, deletions: stats.deletions || 0, isMerge };
}

function deltaFromScore(analysis) {
  const happiness = Math.round((analysis.score - 50) / 4);
  const hunger = 2;
  const health = analysis.score < 40 ? Math.round((analysis.score - 40) / 12) : 0;
  return { happiness, hunger, health };
}

function tierFromScore(score) {
  if (score < 55) return 'small';
  if (score < 75) return 'medium';
  return 'large';
}

function healFromTier(tier) {
  switch (tier) {
    case 'small':
      return { hungerRestore: 15, health: 1 };
    case 'large':
      return { hungerRestore: 45, health: 5 };
    case 'medium':
    default:
      return { hungerRestore: 30, health: 3 };
  }
}

function applyBranchRule(delta, isLifeBranch) {
  const dmg = isLifeBranch
    ? { ...delta }
    : {
        happiness: Math.max(0, delta.happiness),
        hunger: delta.hunger,
        health: Math.max(0, delta.health),
      };
  return dmg;
}

module.exports = { scoreCommit, deltaFromScore, tierFromScore, healFromTier, applyBranchRule, loadCommitDetails };