const fs = require('fs');
const path = require('path');

// 커밋을 따라서 로그 출력
function log() {
  const repoPath = path.join(process.cwd(), '.dvcs');
  const objectsPath = path.join(repoPath, 'objects');
  const headPath = path.join(repoPath, 'HEAD');

  // dvcs 레포지토리 확인
  if (!fs.existsSync(repoPath)) {
    console.log(
      "현재 디렉토리가 dvcs 레포지토리가 아닙니다. 먼저 'dvcs init'을 실행하세요."
    );
    return;
  }

  // HEAD가 있는지 확인하기
  if (!fs.existsSync(headPath)) {
    console.log('커밋이 존재하지 않습니다.');
    return;
  }

  // HEAD에서 최신 커밋 해시 읽기
  const headContent = fs.readFileSync(headPath, 'utf-8').trim();
  let currentCommitHash = '';

  if (headContent.startsWith('ref: ')) {
    // 브랜치를 가리키는 경우 -> 브랜치 경로에서 커밋 해시 읽기
    const refsPath = headContent.substring('ref: '.length).trim();
    const branchPath = path.join(repoPath, refsPath);

    if (!fs.existsSync(branchPath)) {
      console.log('브랜치 정보가 손상되었습니다.');
      return;
    }

    currentCommitHash = fs.readFileSync(branchPath, 'utf-8').trim();
  } else {
    currentCommitHash = headContent;
  }

  // parent 객체 따라가면서 commit 기록 추출하기
  while (currentCommitHash) {
    const dir = currentCommitHash.substring(0, 2);
    const file = currentCommitHash.substring(2);
    const commitObjectPath = path.join(objectsPath, dir, file);

    // 부모 커밋 해시가 없을 경우 `
    if (!fs.existsSync(commitObjectPath)) {
      break;
    }

    // 파일 읽기
    const content = fs.readFileSync(commitObjectPath, 'utf-8').trim();
    const lines = content.split('\n');

    let parentHash = '';
    let commitMessage = '';

    // 파싱
    for (const line of lines) {
      if (line.startsWith('parent ')) {
        parentHash = line.split(' ')[1];
      }
      if (line.startsWith('message ')) {
        commitMessage = line.substring('message '.length).trim();
      }
    }

    console.log(`commit - ${currentCommitHash}`);
    console.log(`commit message - ${commitMessage}\n`);

    // 부모 커밋 탐색
    currentCommitHash = parentHash;
  }
}

module.exports = log;
