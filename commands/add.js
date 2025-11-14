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

  // blob 경로 생성
  const objectDir = path.join(repoPath, 'objects', dir);
  const objectPath = path.join(objectDir, filename);

  // blob 폴더 생성
  if (!fs.existsSync(objectDir)) {
    fs.mkdirSync(objectDir, { recursive: true });
  }

  // blob 파일 생성
  if (!fs.existsSync(objectPath)) {
    fs.writeFileSync(objectPath, content);
  }

  // index 파일 경로 생성
  const indexPath = path.join(repoPath, 'index');

  // index 파일이 없으면 생성
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(indexPath, '');
  }

  // index 읽기
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  const lines = indexContent
    .trim()
    .split('\n')
    .filter((line) => line.length > 0);

  // 같은 파일이 index에 이미 있는지 찾기
  const updatedLines = [];
  let found = false;

  // index 파일 업데이트
  for (const line of lines) {
    const [oldHash, oldPath] = line.split(' ');

    if (oldPath === filepath) {
      // 파일이 이미 스테이지에 있던 경우
      found = true;
      if (oldHash !== hash) {
        console.log('스테이지된 파일이 수정되었습니다.');
        updatedLines.push(`${hash} ${filepath}`);
      } else {
        console.log('파일이 이미 스테이지에 있습니다.');
        updatedLines.push(line);
      }
    } else {
      updatedLines.push(line);
    }
  }

  // 새로운 파일일 때
  if (!found) {
    console.log('새로운 파일이 스테이지에 추가되었습니다.');
    updatedLines.push(`${hash} ${filepath}`);
  }

  // index 파일 덮어쓰기
  fs.writeFileSync(indexPath, updatedLines.join('\n') + '\n');
}

module.exports = add;
