const fs = require('fs');
const path = require('path');
const sha1 = require('../utils/sha1');

function commit(message) {
  const repoPath = path.join(process.cwd(), '.vcs');
  const indexPath = path.join(repoPath, 'index');
  const objectsPath = path.join(repoPath, 'objects');
  const headPath = path.join(repoPath, 'HEAD');

  // vcs 폴더가 없는 경우
  if (!fs.existsSync(repoPath)) {
    console.log(
      "현재 디렉토리가 vcs 레포지토리가 아닙니다. 먼저 'vcs init'을 실행하세요."
    );
    return;
  }

  if (!fs.existsSync(indexPath)) {
    console.log('스테이지에 올라간 파일이 없습니다.');
    return;
  }

  const indexLines = fs
    .readFileSync(indexPath, 'utf-8')
    .trim()
    .split('\n')
    .filter((line) => line.length > 0);

  const entries = indexLines.map((line) => {
    const [hash, filepath] = line.split(' ');
    return { hash, filepath };
  });

  // tree 객체 만들기
  let treeContent = '';
  for (const entry of entries) {
    treeContent += `100644 blob ${entry.hash} ${entry.filepath}\n`;
  }

  const treeHash = sha1(treeContent);
  const treeDir = treeHash.substring(0, 2);
  const treeFile = treeHash.substring(2);
  const treeFolder = path.join(objectsPath, treeDir);

  if (!fs.existsSync(treeFolder)) {
    fs.mkdirSync(treeFolder, { recursive: true });
  }

  const treeObjectPath = path.join(treeFolder, treeFile);
  if (!fs.existsSync(treeObjectPath)) {
    fs.writeFileSync(treeObjectPath, treeContent);
  }

  // 부모 객체 불러오기
  let parent = '';
  if (fs.existsSync(headPath)) {
    parent = fs.readFileSync(headPath, 'utf-8').trim();
  }

  // commit 객체 생성하기
  let commitContent = `tree ${treeHash}\n`;
  if (parent) commitContent += `parent ${parent}\n`;
  commitContent += `message ${message}\n`;

  const commitHash = sha1(commitContent);
  const commitDir = commitHash.substring(0, 2);
  const commitFile = commitHash.substring(2);
  const commitFolder = path.join(objectsPath, commitDir);

  if (!fs.existsSync(commitFolder)) {
    fs.mkdirSync(commitFolder, { recursive: true });
  }

  const commitObjectPath = path.join(commitFolder, commitFile);
  fs.writeFileSync(commitObjectPath, commitContent);

  // HEAD 업데이트하기
  fs.writeFileSync(headPath, commitHash);

  console.log(`새 커밋이 생성되었습니다. ${commitHash}`);
}

module.exports = commit;
