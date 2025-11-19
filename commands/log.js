const fs = require('fs');
const path = require('path');

// HEAD에서 시작해 parent를 따라 올라가며 로그 출력
function log() {
  const repoPath = path.join(process.cwd(), '.vcs');
  const objectsPath = path.join(repoPath, 'objects');
  const headPath = path.join(repoPath, 'HEAD');

  // .vcs가 존재하는지 확인
  if (!fs.existsSync(repoPath)) {
    console.log(
      "현재 디렉토리가 vcs 레포지토리가 아닙니다. 먼저 'vcs init'을 실행하세요."
    );
    return;
  }

  // HEAD가 없으면 커밋 자체가 없는 상태
  if (!fs.existsSync(headPath)) {
    console.log('커밋이 존재하지 않습니다.');
    return;
  }

  // HEAD에서 최신 커밋 해시 읽기
  let currentCommitHash = fs.readFileSync(headPath, 'utf-8').trim();

  // parent를 따라가며 전체 커밋 로그를 역순으로 출력
  while (currentCommitHash) {
    const dir = currentCommitHash.substring(0, 2);
    const file = currentCommitHash.substring(2);
    const commitObjectPath = path.join(objectsPath, dir, file);

    if (!fs.existsSync(commitObjectPath)) {
      break;
    }

    // 커밋 객체 내용 읽기
    const content = fs.readFileSync(commitObjectPath, 'utf-8').trim();
    const lines = content.split('\n');

    const parentHash = lines[1].split(' ')[1];
    const commitMessage = lines[2].substring('message '.length).trim();

    console.log(`commit ${currentCommitHash}`);
    console.log(`    ${commitMessage}\n`);

    currentCommitHash = parentHash;
  }
}

module.exports = log;
