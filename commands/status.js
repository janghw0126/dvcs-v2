const fs = require('fs');
const path = require('path');
const sha1 = require('../utils/sha1');

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

function status() {
  const repoPath = path.join(process.cwd(), '.dvcs');
  const headPath = path.join(repoPath, 'HEAD');
  const objectsPath = path.join(repoPath, 'objects');
  const indexPath = path.join(repoPath, 'index');

  if (!fs.existsSync(repoPath)) {
    console.log(
      "현재 디렉토리가 dvcs 레포지토리가 아닙니다. 먼저 'dvcs init'을 실행하세요."
    );
    return;
  }

  // 현재 브랜치명 출력하기
  const headContent = fs.readFileSync(headPath, 'utf-8').trim();
  const branchName = headContent.substring('ref: refs/heads/'.length);
  console.log(`Current Branch : ${branchName}`);

  const branchPath = path.join(repoPath, 'refs', 'heads', branchName);
  let commitHash = '';

  // HEAD가 가리키는 커밋 해시 출력하기
  if (fs.existsSync(branchPath)) {
    commitHash = fs.readFileSync(branchPath, 'utf-8').trim();
    console.log(`Current Commit: ${commitHash}\n`);
  } else {
    console.log('아직 커밋이 없습니다.\n');
  }

  let commitFiles = {};
  if (commitHash) {
    const commitDir = commitHash.substring(0, 2);
    const commitFile = commitHash.substring(2);
    const commitFolder = path.join(objectsPath, commitDir);
    const commitObjectPath = path.join(commitFolder, commitFile);

    const commitContent = fs.readFileSync(commitObjectPath, 'utf-8').trim();
    const lines = commitContent.split('\n');
    const treeHash = lines[0].split(' ')[1];

    commitFiles = readTree(treeHash, objectsPath);
  }

  let indexFiles = {};
  if (fs.existsSync(indexPath)) {
    const indexLines = fs.readFileSync(indexPath, 'utf-8').trim().split('\n');

    for (const line of indexLines) {
      const [hash, filepath] = line.split(' ');
      indexFiles[filepath] = hash;
    }
  }

  const workingFiles = {};
  const allFiles = fs.readdirSync(process.cwd());

  for (const file of allFiles) {
    if (file === '.dvcs') continue;
    if (fs.statSync(file).isFile()) {
      const content = fs.readFileSync(file);
      workingFiles[file] = sha1(content);
    }
  }

  // commit 대상일 때
  const stagedChanges = [];

  for (const file in indexFiles) {
    const indexHash = indexFiles[file];
    const commitBlobHash = commitFiles[file];

    if (indexHash !== commitBlobHash) {
      stagedChanges.push(file);
    }
  }

  if (stagedChanges.length > 0) {
    console.log('Changes to be committed:');
    stagedChanges.forEach((f) => console.log(`  ${f}`));
    console.log('');
  }

  // 파일이 수정되었지만 아직 add되지 않은 상태일 떄
  const notStaged = [];

  for (const file in indexFiles) {
    if (workingFiles[file] && workingFiles[file] !== indexFiles[file]) {
      notStaged.push(file);
    }
  }

  if (notStaged.length > 0) {
    console.log('Changes not staged for commit:');
    notStaged.forEach((f) => console.log(`  modified: ${f}`));
    console.log('');
  }

  // index에도 없고 commit에도 없는 새파일일 때
  const untracked = [];

  for (const file in workingFiles) {
    if (!indexFiles[file] && !commitFiles[file]) {
      untracked.push(file);
    }
  }

  if (untracked.length > 0) {
    console.log('Untracked files:');
    untracked.forEach((f) => console.log(`  ${f}`));
    console.log('');
  }
}

module.exports = status;
