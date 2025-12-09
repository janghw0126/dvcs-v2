const fs = require('fs');
const path = require('path');
const readTree = require('../utils/readTree');

// soft reset 구현 -> HEAD만 특정 커밋으로 이동
function reset(commitHash, option = '--soft') {
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

  // HEAD 체크
  const headContent = fs.readFileSync(headPath, 'utf-8').trim();

  // 현재 HEAD가 가리키는 커밋 해시 구하기
  let currentHeadCommit = '';
  let branchPath = null;

  if (headContent.startsWith('ref: ')) {
    branchPath = path.join(repoPath, headContent.substring(5));
    if (fs.existsSync(branchPath)) {
      currentHeadCommit = fs.readFileSync(branchPath, 'utf-8').trim();
    }
  } else {
    currentHeadCommit = headContent;
  }

  // 이미 동일한 커밋이면 reset 하지 않음
  if (currentHeadCommit === commitHash) {
    console.log(`이미 HEAD가 커밋 ${commitHash}를 가리키고 있습니다.`);
    return;
  }

  // reset하려는 커밋이 실제로 존재하는지 확인
  const dir = commitHash.substring(0, 2);
  const file = commitHash.substring(2);
  const commitObjectPath = path.join(objectsPath, dir, file);

  if (!fs.existsSync(commitObjectPath)) {
    console.log(`[Error] 커밋 '${commitHash}'가 존재하지 않습니다.`);
    return;
  }

  if (branchPath) {
    fs.writeFileSync(branchPath, commitHash);
  } else {
    fs.writeFileSync(headPath, commitHash);
  }

  // 커밋만 이동시키는 soft reset인 경우
  if (option === '--soft') {
    console.log(`soft reset: HEAD가 ${commitHash}로 이동했습니다.`);
    return;
  }

  // 워킹 디렉토리를 바꾸는 hard reset인 경우
  const commitContent = fs.readFileSync(commitObjectPath, 'utf-8');
  const treeLine = commitContent
    .split('\n')
    .find((line) => line.startsWith('tree '));

  const treeHash = treeLine.split(' ')[1];

  // tree를 이용하여 파일 경로를 따라 해시 읽기
  const files = readTree(treeHash, objectsPath);

  // 워킹 디렉토리 초기화
  for (const filePath in files) {
    const blobHash = files[filePath];
    const blobDir = blobHash.substring(0, 2);
    const blobFile = blobHash.substring(2);
    const blobPath = path.join(objectsPath, blobDir, blobFile);

    const content = fs.readFileSync(blobPath, 'utf-8');
    const absPath = path.join(process.cwd(), filePath);

    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, content);
  }

  // index 재작성
  const indexLines = Object.entries(files)
    .map(([file, hash]) => `${hash} ${file}`)
    .join('\n');

  fs.writeFileSync(indexPath, indexLines + '\n');

  console.log(`hard reset: ${commitHash} 상태로 복원되었습니다.`);
}

module.exports = reset;
