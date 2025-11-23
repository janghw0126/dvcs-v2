const fs = require('fs');
const path = require('path');

function branch(branchName) {
  const repoPath = path.join(process.cwd(), '.dvcs');
  const headPath = path.join(repoPath, 'HEAD');
  const branchesPath = path.join(repoPath, 'refs', 'heads');
  const newBranchPath = path.join(branchesPath, branchName);

  if (fs.existsSync(newBranchPath)) {
    console.log('이미 존재하는 브랜치입니다.');
    return;
  }

  // HEAD가 가리키는 대상 읽기
  const headContent = fs.readFileSync(headPath, 'utf-8').trim();

  if (!headContent) {
    console.log('현재 HEAD가 비어 있습니다. 커밋 후 브랜치를 생성하세요.');
    return;
  }

  // HEAD를 읽어서 브랜치 만들기
  let currentCommit = '';

  // 포인터가 될 commit 해시 추출하기
  if (headContent.startsWith('ref: ')) {
    const refPath = headContent.substring('ref: '.length).trim();
    const currentBranchPath = path.join(repoPath, refPath);
    currentCommit = fs.readFileSync(currentBranchPath, 'utf-8').trim();
  } else {
    currentCommit = headContent;
  }

  // 새 브랜치 생성
  fs.writeFileSync(newBranchPath, currentCommit);
  console.log(`새 브랜치인 ${branchName}가 생성되었습니다.`);
}

module.exports = branch;
