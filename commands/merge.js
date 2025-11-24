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

function merge(targetBranch) {
  const repoPath = path.join(process.cwd(), '.dvcs');
  const headPath = path.join(repoPath, 'HEAD');
  const objectsPath = path.join(repoPath, 'objects');

  // HEAD 체크
  const headContent = fs.readFileSync(headPath, 'utf-8').trim();
  if (!headContent.startsWith('ref: ')) {
    console.log(
      '[Error] 현재 HEAD가 브랜치를 가리키고 있지 않습니다 (detached HEAD).'
    );
    return;
  }

  const headBranchPath = path.join(repoPath, headContent.substring(5));
  const currentCommit = fs.readFileSync(headBranchPath, 'utf-8').trim();

  // 병합할(target) 브랜치 커밋 읽기
  const targetBranchPath = path.join(repoPath, 'refs', 'heads', targetBranch);
  if (!fs.existsSync(targetBranchPath)) {
    console.log(`[Error] 브랜치 '${targetBranch}'가 존재하지 않습니다.`);
    return;
  }
  const targetCommit = fs.readFileSync(targetBranchPath, 'utf-8').trim();

  console.log(`현재 브랜치 커밋: ${currentCommit}`);
  console.log(`병합할 브랜치 커밋: ${targetCommit}`);

  // fast-forward 가능하면 포인터만 옮기기
  if (isAncestor(currentCommit, targetCommit, objectsPath)) {
    console.log('Fast-forward merge를 수행 중입니다.');

    fs.writeFileSync(headBranchPath, `${targetCommit}\n`);

    console.log(
      `Fast-forward: 현재 브랜치가 '${targetBranch}' 브랜치의 최신 커밋으로 이동했습니다.`
    );
    return;
  }

  // fast-forward가 아니면 -> 두 브랜치의 tree 읽어서 비교
  const currentTree = getTreeFromCommit(currentCommit, objectsPath);
  const targetTree = getTreeFromCommit(targetCommit, objectsPath);

  // merge 결과 출력하기
  const { mergedTree, conflicts } = mergeTrees(currentTree, targetTree);

  if (conflicts.length > 0) {
    console.log('[Error] merge conflict가 발생하였습니다.');
    console.log('충돌 파일 목록:');
    conflicts.forEach((file) => console.log(` ${file}`));
    console.log('충돌을 해결한 후 다시 커밋하세요.');
    return;
  }

  // 병합 결과를 새로운 tree 객체로 저장
  const treeHash = writeTree(mergedTree, objectsPath);

  // merge 커밋 생성
  const mergeCommitContent = `tree ${treeHash}\nparent ${currentCommit}\nparent ${targetCommit}\nmessage Merge branch '${targetBranch}'\n`;

  const mergeCommitHash = sha1(mergeCommitContent);

  const commitDir = mergeCommitHash.substring(0, 2);
  const commitFile = mergeCommitHash.substring(2);
  const commitPath = path.join(objectsPath, commitDir);

  if (!fs.existsSync(commitPath)) {
    fs.mkdirSync(commitPath);
  }
  fs.writeFileSync(path.join(commitPath, commitFile), mergeCommitContent);

  fs.writeFileSync(headBranchPath, mergeCommitHash);

  console.log(`Merge commit 생성이 완료되었습니다: ${mergeCommitHash}`);
}

// targetCommit이 currentCommit의 조상인지 반복해서 확인하는 함수
function isAncestor(base, targetCommit, objectsPath) {
  let currentCommit = targetCommit;

  while (currentCommit) {
    if (currentCommit === base) return true;

    const objPath = path.join(
      objectsPath,
      currentCommit.substring(0, 2),
      currentCommit.substring(2)
    );
    if (!fs.existsSync(objPath)) break;

    const content = fs.readFileSync(objPath, 'utf-8').trim();
    const lines = content.split('\n');

    let parentCommit = '';
    for (const line of lines) {
      if (line.startsWith('parent ')) {
        parentCommit = line.split(' ')[1];
        break;
      }
    }

    currentCommit = parentCommit;
  }

  return false;
}

// 커밋에서 tree 해시 읽고 -> readTree로 변환하는 함수
function getTreeFromCommit(commitHash, objectsPath) {
  const objPath = path.join(
    objectsPath,
    commitHash.substring(0, 2),
    commitHash.substring(2)
  );

  const content = fs.readFileSync(objPath, 'utf-8').trim();
  const firstLine = content.split('\n')[0];
  const treeHash = firstLine.split(' ')[1];

  return readTree(treeHash, objectsPath);
}

// 두 tree를 비교해서 병합하는 함수
function mergeTrees(first, second) {
  const merged = {};
  const conflicts = [];

  // 두 브랜치의 파일 목록 합치기
  const allfiles = new Set([...Object.keys(first), ...Object.keys(second)]);

  for (const file of allfiles) {
    const hash1 = first[file];
    const hash2 = second[file];

    // 한쪽 브랜치에만 파일이 있는 경우 -> 존재하는 쪽을 선택
    if (hash1 && !hash2) {
      merged[file] = hash1;
    } else if (!hash1 && hash2) {
      merged[file] = hash2;
    }
    // 둘 다 있는 경우 -> 내용이 같은지 확인
    else {
      if (hash1 !== hash2) {
        conflicts.push(file);
      } else {
        merged[file] = hash1;
      }
    }
  }

  return { mergedTree: merged, conflicts };
}

// 병합 결과를 새로운 tree 객체로 저장
function writeTree(treeObj, objectsPath) {
  let treeContent = '';
  for (const file in treeObj) {
    treeContent += `100644 blob ${treeObj[file]} ${file}\n`;
  }

  const treeHash = sha1(treeContent);
  const dir = treeHash.substring(0, 2);
  const file = treeHash.substring(2);

  const outDir = path.join(objectsPath, dir);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  fs.writeFileSync(path.join(outDir, file), treeContent);

  return treeHash;
}

module.exports = merge;
