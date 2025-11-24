const fs = require('fs');
const path = require('path');

function init() {
  // 현재 명령어를 실행한 위치에 .dvcs 폴더를 만들기 위해 정확한 전체 경로를 만듦
  const repoPath = path.join(process.cwd(), '.dvcs');

  if (!fs.existsSync(repoPath)) {
    // 폴더 생성
    fs.mkdirSync(repoPath);
    fs.mkdirSync(path.join(repoPath, 'objects'));
    fs.mkdirSync(path.join(repoPath, 'refs'));
    fs.mkdirSync(path.join(repoPath, 'refs', 'heads'));
    fs.mkdirSync(path.join(repoPath, 'refs', 'tags'));

    // master 브랜치 생성
    const masterPath = path.join(repoPath, 'refs', 'heads', 'master');
    fs.writeFileSync(masterPath, '');

    // HEAD가 master 브랜치를 가리키도록 설정
    const headPath = path.join(repoPath, 'HEAD');
    fs.writeFileSync(headPath, 'ref: refs/heads/master');

    console.log(
      '.dvcs/ 폴더가 생성되었고, 버전 관리를 위한 기본 구조가 준비되었습니다.'
    );
  } else {
    console.log('.dvcs가 이미 존재합니다.');
  }
}

module.exports = init;
