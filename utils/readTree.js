const fs = require('fs');
const path = require('path');

// tree 해시를 읽어 파일 경로 -> blob 해시 형태로 풀어서 반환
function readTree(treeHash, objectsPath, prefix = '') {
  const dir = treeHash.substring(0, 2);
  const file = treeHash.substring(2);
  const treePath = path.join(objectsPath, dir, file);

  const result = {};

  const content = fs.readFileSync(treePath, 'utf-8').trim();
  const lines = content.split('\n');

  for (const line of lines) {
    const parts = line.split(' ');
    const type = parts[1];
    const hash = parts[2];
    const name = parts[3];

    let fullPath = '';
    if (prefix === '') {
      fullPath = name;
    } else {
      fullPath = prefix + '/' + name;
    }

    // 파일이면 blob 기록
    if (type === 'blob') {
      result[fullPath] = hash;
    }

    // 폴더면 재귀
    if (type === 'tree') {
      const sub = readTree(hash, objectsPath, fullPath);
      Object.assign(result, sub);
    }
  }

  return result;
}

module.exports = readTree;
