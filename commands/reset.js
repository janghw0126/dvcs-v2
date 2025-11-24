const fs = require('fs');
const path = require('path');

// soft reset 구현 -> HEAD만 특정 커밋으로 이동
function reset(commitHash) {
  const repoPath = path.join(process.cwd(), '.dvcs');
  const headPath = path.join(repoPath, 'HEAD');

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

  if (headContent.startsWith('ref: ')) {
    const branchPath = path.join(repoPath, headContent.substring(5));
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
  const objectsPath = path.join(repoPath, 'objects');
  const dir = commitHash.substring(0, 2);
  const file = commitHash.substring(2);

  const commitObjectPath = path.join(objectsPath, dir, file);

  if (!fs.existsSync(commitObjectPath)) {
    console.log(`[Error] 커밋 '${commitHash}'가 존재하지 않습니다.`);
    return;
  }

  // HEAD가 브랜치를 가리키는 경우
  if (headContent.startsWith('ref: ')) {
    const branchPath = path.join(repoPath, headContent.substring(5));
    fs.writeFileSync(branchPath, commitHash);
    console.log(`브랜치가 ${commitHash}로 이동했습니다.`);
    return;
  }

  // detached HEAD 상태인 경우
  fs.writeFileSync(headPath, commitHash);
  console.log(`HEAD가 직접 ${commitHash}로 이동했습니다 (detached HEAD 상태).`);
}

module.exports = reset;
