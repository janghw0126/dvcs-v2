const fs = require('fs');
const path = require('path');
const sha1 = require('../utils/sha1');

// 디렉토리 트리 생성
function buildFolder(entries) {
  const root = {};

  for (const { hash, filepath } of entries) {
    const parts = filepath.split('/');
    let current_folder = root;

    // 마지막 파일명을 제외한 디렉토리 경로 생성
    for (let i = 0; i < parts.length - 1; i++) {
      const folder = parts[i];
      if (!current_folder[folder]) current_folder[folder] = {};
      current_folder = current_folder[folder];
    }

    // 마지막 파일 -> blob 해시로 저장
    const fileName = parts[parts.length - 1];
    current_folder[fileName] = hash;
  }

  return root;
}

// tree 객체 생성
function generateTree(node, objectsPath) {
  const lines = [];

  // 동일한 tree 생성을 위해 정렬
  const names = Object.keys(node).sort();

  for (const name of names) {
    const value = node[name];

    if (typeof value === 'string') {
      // 파일이면 blob
      lines.push(`100644 blob ${value} ${name}`);
    } else {
      // 폴더면 blob로 남을 때까지 재귀 호출
      const subtreeHash = generateTree(value, objectsPath);
      lines.push(`040000 tree ${subtreeHash} ${name}`);
    }
  }

  // tree 객체 생성해서 해시화
  const treeContent = lines.join('\n') + '\n';
  const treeHash = sha1(treeContent);

  const dir = treeHash.substring(0, 2);
  const file = treeHash.substring(2);
  const folderPath = path.join(objectsPath, dir);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  const treeObjectPath = path.join(folderPath, file);

  // 중복 tree 객체 있는 경우 -> 이미 있으니 생성 X
  if (!fs.existsSync(treeObjectPath)) {
    fs.writeFileSync(treeObjectPath, treeContent);
  }

  return treeHash;
}

function commit(message) {
  const repoPath = path.join(process.cwd(), '.dvcs');
  const indexPath = path.join(repoPath, 'index');
  const objectsPath = path.join(repoPath, 'objects');
  const headPath = path.join(repoPath, 'HEAD');

  // dvcs 폴더가 없는 경우
  if (!fs.existsSync(repoPath)) {
    console.log(
      "현재 디렉토리가 dvcs 레포지토리가 아닙니다. 먼저 'dvcs init'을 실행하세요."
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

  // index -> json 형태로 폴더 구조 만들기
  const treeStructure = buildFolder(entries);

  // tree 객체 만들고 해시 반환
  const treeHash = generateTree(treeStructure, objectsPath);

  // 부모 commit 해시 불러오기
  let parent = '';
  let branchRefsPath = '';

  if (fs.existsSync(headPath)) {
    const headContent = fs.readFileSync(headPath, 'utf-8').trim();

    if (headContent.startsWith('ref: ')) {
      // HEAD가 브랜치를 가리키는 경우
      const ref = headContent.substring('ref: '.length).trim();
      branchRefsPath = path.join(repoPath, ref);
      if (fs.existsSync(branchRefsPath)) {
        parent = fs.readFileSync(branchRefsPath, 'utf-8').trim();
      }
    } else {
      // detached HEAD일 경우 HEAD 자체가 commit 해시를 가지도록 하기
      parent = headContent;
    }
  }

  // commit 객체 생성하기
  let commitContent = `tree ${treeHash}\n`;
  if (parent) commitContent += `parent ${parent}\n`;
  commitContent += `message ${message}\n`;

  const commitHash = sha1(commitContent);

  // 최신 상태인지 확인하기
  let prevTree = '';
  if (parent) {
    const parentDir = parent.substring(0, 2);
    const parentFile = parent.substring(2);
    const parentCommitPath = path.join(objectsPath, parentDir, parentFile);

    if (fs.existsSync(parentCommitPath)) {
      const parentContent = fs.readFileSync(parentCommitPath, 'utf-8');
      const firstLine = parentContent.split('\n')[0];
      prevTree = firstLine.split(' ')[1];
    }
  }

  if (prevTree === treeHash) {
    console.log('이미 최신 상태입니다.');
    return;
  }

  // commit 객체 저장
  const commitDir = commitHash.substring(0, 2);
  const commitFile = commitHash.substring(2);
  const commitFolder = path.join(objectsPath, commitDir);

  if (!fs.existsSync(commitFolder)) {
    fs.mkdirSync(commitFolder, { recursive: true });
  }

  const commitObjectPath = path.join(commitFolder, commitFile);
  fs.writeFileSync(commitObjectPath, commitContent);

  // 브랜치 파일에 commit hash 업데이트 하기
  if (branchRefsPath) {
    fs.writeFileSync(branchRefsPath, commitHash);
  } else {
    fs.writeFileSync(headPath, commitHash);
  }

  // 커밋 출력하기
  console.log(`새 커밋이 생성되었습니다. ${commitHash}`);
}

module.exports = commit;
