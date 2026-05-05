const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\cliente\\.gemini\\antigravity\\skills';
const skills = fs.readdirSync(baseDir).filter(d => d.startsWith('gsd-') && fs.statSync(path.join(baseDir, d)).isDirectory());

const results = {};

skills.forEach(skill => {
  const skillFile = path.join(baseDir, skill, 'SKILL.md');
  if (fs.existsSync(skillFile)) {
    const content = fs.readFileSync(skillFile, 'utf8');
    const match = content.match(/description:\s*["']?(.*?)["']?\n/);
    if (match) {
      results[skill] = match[1];
    }
  }
});

console.log(JSON.stringify(results, null, 2));
