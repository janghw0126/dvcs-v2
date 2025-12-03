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

// commit의 모든 조상 목록 찾기
function getAllAncestors(commitHash, objectsPath) {
  const ancestors = new Set();
  const stack = [commitHash];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || ancestors.has(current)) continue;

    ancestors.add(current);

    const objPath = path.join(
      objectsPath,
      current.substring(0, 2),
      current.substring(2)
    );
    if (!fs.existsSync(objPath)) continue;

    const lines = fs.readFileSync(objPath, 'utf-8').trim().split('\n');

    for (const line of lines) {
      if (line.startsWith('parent ')) {
        const parent = line.split(' ')[1];
        stack.push(parent);
      }
    }
  }

  return ancestors;
}

// 공통 조상 찾기
function findMergeBase(commitA, commitB, objectsPath) {
  const ancestorsA = getAllAncestors(commitA, objectsPath);

  // B 조상을 올라가며 A 조상 집합과 처음 만나는 지점이 공통 조상임
  let current = commitB;
  while (current) {
    if (ancestorsA.has(current)) return current;

    const objPath = path.join(
      objectsPath,
      current.substring(0, 2),
      current.substring(2)
    );
    if (!fs.existsSync(objPath)) break;

    const lines = fs.readFileSync(objPath, 'utf-8').trim().split('\n');
    let parent = null;

    for (const line of lines) {
      if (line.startsWith('parent ')) {
        parent = line.split(' ')[1];
        break;
      }
    }

    current = parent;
  }

  return null;
}

// 3-way merge 함수 구현
function mergeThreeWay(base, ours, theirs) {
  const merged = {};
  const conflicts = [];

  const allFiles = new Set([
    ...Object.keys(base),
    ...Object.keys(ours),
    ...Object.keys(theirs),
  ]);

  for (const file of allFiles) {
    const b = base[file];
    const o = ours[file];
    const t = theirs[file];

    if (b === o && b === t) {
      if (o) merged[file] = o;
      continue;
    }

    if (b === o && b !== t) {
      merged[file] = t;
      continue;
    }

    if (b === t && b !== o) {
      merged[file] = o;
      continue;
    }

    // 둘 다 base에서 변경됐지만 같은 변경인 경우
    if (o && t && o === t) {
      merged[file] = o;
      continue;
    }

    // 둘 다 base에서 다르게 변경됨 -> Conflict
    conflicts.push(file);
  }

  return { mergedTree: merged, conflicts };
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

// blob 내용을 working directory에 실제로 쓰는 함수
function writeWorkingDirectory(mergedTree, objectsPath) {
  for (const filePath in mergedTree) {
    const blobHash = mergedTree[filePath];

    const blobDir = blobHash.substring(0, 2);
    const blobFile = blobHash.substring(2);
    const blobPath = path.join(objectsPath, blobDir, blobFile);

    const content = fs.readFileSync(blobPath, 'utf-8');

    // 부모 디렉토리 없으면 생성
    const wdPath = path.join(process.cwd(), filePath);
    const parentDir = path.dirname(wdPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(wdPath, content);
  }
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

  // merge-base 찾기
  const baseCommit = findMergeBase(currentCommit, targetCommit, objectsPath);
  if (!baseCommit) {
    console.log('[Error] 공통 조상을 찾을 수 없습니다.');
    return;
  }

  console.log(`Merge-base: ${baseCommit}`);

  // base, ours, theirs의 tree 읽기
  const baseTree = getTreeFromCommit(baseCommit, objectsPath);
  const oursTree = getTreeFromCommit(currentCommit, objectsPath);
  const theirsTree = getTreeFromCommit(targetCommit, objectsPath);

  // 3-way merge 수행
  const { mergedTree, conflicts } = mergeThreeWay(
    baseTree,
    oursTree,
    theirsTree
  );

  if (conflicts.length > 0) {
    console.log('[Error] merge conflict 발생:');
    conflicts.forEach((file) => console.log(`  - ${file}`));
    console.log('충돌 해결 후 다시 커밋하세요.');
    return;
  }

  // Working Directory 업데이트
  writeWorkingDirectory(mergedTree, objectsPath);

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

module.exports = merge;
