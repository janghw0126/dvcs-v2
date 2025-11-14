const fs = require('fs');
const path = require('path');
const sha1 = require('../utils/sha1');

function add(filepath) {
  const repoPath = path.join(process.cwd(), '.vcs');

  // .vcs가 존재하는지 확인
  if (!fs.existsSync(repoPath)) {
    console.log(
      "현재 디렉토리가 vcs 레포지토리가 아닙니다. 먼저 'vcs init'을 실행하세요."
    );
    return;
  }

  // 추가하려는 파일이 존재하는지 확인
  if (!fs.existsSync(filepath)) {
    console.log(`파일을 찾을 수 없습니다: ${filepath}`);
    return;
  }

  // 파일 읽기
  const content = fs.readFileSync(filepath);

  // SHA-1 해시 생성
  const hash = sha1(content);
  const dir = hash.substring(0, 2);
  const filename = hash.substring(2);

  // objects/dir 디렉토리 생성
  const objectDir = path.join(repoPath, 'objects', dir);

  // 디렉토리 존재하지 않으면 새로 생성
  if (!fs.existsSync(objectDir)) {
    fs.mkdirSync(objectDir, { recursive: true });
  }

  // blob 파일 생성
  const objectPath = path.join(objectDir, filename);

  // 중복 확인(같은 내용의 파일인 경우)
  if (!fs.existsSync(objectPath)) {
    fs.writeFileSync(objectPath, content);
  }

  console.log(`파일이 스테이지에 추가되었습니다: ${filepath}`);
  console.log(`저장된 blob: objects/${dir}/${filename}`);

  // 스테이징 영역(index)에 추가
  const indexPath = path.join(repoPath, 'index');
  const indexEntry = `${hash} ${filepath}\n`;

  fs.appendFileSync(indexPath, indexEntry);
}

module.exports = add;
