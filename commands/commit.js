const fs = require('fs');
const path = require('path');
const sha1 = require('../utils/sha1');

// index에 스테이징 된 파일명와 파일 내용이 저장되어있는 blob 해시을 읽는다.
// 파일들의 blob 해시를 기반으로 폴더 구조를 저장하기 위해 tree 객체를 만든다.
// tree 해시와 부모 해시 등등을 기반으로 commit 객체를 만들고 object 파일에 넣는다.(blob과 똑같은 폴더)
// Head를 새 commit 해시로 갱신한다.
function commit(message) {
  const repoPath = path.join(process.cwd(), '.vcs');
  const indexPath = path.join(repoPath, 'index');

  if (!fs.existsSync(repoPath)) {
    console.log(
      "현재 디렉토리가 vcs 레포지토리가 아닙니다. 먼저 'vcs init'을 실행하세요."
    );
    return;
  }

  // index 파일 읽기
  if (!fs.existsSync(indexPath)) {
    console.log(
      '스테이지에 올라간 파일이 없습니다. 먼저 파일을 스테이지에 추가하세요.'
    );
    return;
  }

  const indexContent = fs
    .readFileSync(indexPath, 'utf-8')
    .trim()
    .split('\n')
    .filter((line) => line.length > 0);

  if (indexContent.length === 0) {
    console.log('스테이지가 비어있습니다.');
    return;
  }

  // index 내용 파싱
  const entries = indexContent.map((line) => {
    const [hash, filepath] = line.split(' ');
    return { hash, filepath };
  });
}

module.exports = commit;
