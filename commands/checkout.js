const fs = require('fs');
const path = require('path');

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

function checkout(branchName) {
  const repoPath = path.join(process.cwd(), '.dvcs');
  const headPath = path.join(repoPath, 'HEAD');
  const branchPath = path.join(repoPath, 'refs', 'heads', branchName);
  const objectsPath = path.join(repoPath, 'objects');
  const indexPath = path.join(repoPath, 'index');

  if (!fs.existsSync(branchPath)) {
    console.log(`브랜치 '${branchName}'는 존재하지 않습니다.`);
    return;
  }

  // HEAD를 해당 브랜치로 변경
  fs.writeFileSync(headPath, `ref: refs/heads/${branchName}\n`);

  // 브랜치 이름이 가리키는 commit 해시 읽기
  const commitHash = fs.readFileSync(branchPath, 'utf-8').trim();

  // 커밋 객체 로드
  const commitDir = commitHash.substring(0, 2);
  const commitFile = commitHash.substring(2);
  const commitObjectPath = path.join(objectsPath, commitDir, commitFile);

  if (!fs.existsSync(commitObjectPath)) {
    console.log('커밋 객체를 찾을 수 없습니다.');
    return;
  }

  const commitContent = fs.readFileSync(commitObjectPath, 'utf-8').trim();
  const commitLines = commitContent.split('\n');
  const treeHash = commitLines[0].split(' ')[1];

  // tree 객체를 읽어서 전체 파일 구조를 path -> blob hash 로 변환
  const commitFiles = readTree(treeHash, objectsPath);

  // index 읽어서 indexFiles에 blob hash를 저장
  let indexFiles = {};
  if (fs.existsSync(indexPath)) {
    const indexLines = fs.readFileSync(indexPath, 'utf-8').trim().split('\n');

    for (const line of indexLines) {
      const [hash, filepath] = line.split(' ');
      indexFiles[filepath] = hash;
    }
  }

  // index 파일을 읽고 현재 작업 상태와 비교
  // 파일이 변경된 상태에서 아직 commit 하지 않았으면 checkout 금지
  for (const file in indexFiles) {
    const filePath = path.join(process.cwd(), file);

    // 파일이 워킹 트리에서 삭제된 경우
    if (!fs.existsSync(filePath)) {
      console.log('[Error] 삭제된 파일이 아직 커밋되지 않았습니다.');
      console.log(`삭제된 파일: ${file}`);
      console.log('파일을 복구하거나 변경 내용을 커밋한 뒤 다시 시도하세요!');
      return;
    }

    // 작업 디렉토리의 내용과 인덱스의 내용이 다를 경우
    if (fs.existsSync(filePath)) {
      const workingContent = fs.readFileSync(filePath, 'utf-8');

      const blobPath = path.join(
        objectsPath,
        indexFiles[file].substring(0, 2),
        indexFiles[file].substring(2)
      );
      const blobContent = fs.readFileSync(blobPath, 'utf-8');

      if (workingContent !== blobContent) {
        console.log(
          '[Error] 커밋되지 않은 변경 사항이 있어 브랜치를 변경할 수 없습니다.'
        );
        console.log(`변경된 파일: ${file}`);
        console.log('먼저 변경한 파일을 커밋하거나 되돌리세요!');
        return;
      }
    }
  }

  // untracked 파일이 충돌하는지 확인
  for (const file in commitFiles) {
    const targetPath = path.join(process.cwd(), file);

    const isUntracked = !indexFiles[file] && fs.existsSync(targetPath);

    if (isUntracked) {
      console.log(
        '[Error] checkout하려는 브랜치의 파일이 untracked 파일과 충돌합니다.'
      );
      console.log(`충돌 파일: ${file}`);
      console.log('파일을 이동하거나 삭제한 뒤 다시 시도하세요!');
      return;
    }
  }

  // 워킹 디렉토리 비우기
  for (const file of Object.keys(indexFiles)) {
    const target = path.join(process.cwd(), file);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
  }

  // commit 해시 기준으로 파일 복원
  for (const file in commitFiles) {
    const blobHash = commitFiles[file];

    const blobPath = path.join(
      objectsPath,
      blobHash.substring(0, 2),
      blobHash.substring(2)
    );
    const fileContent = fs.readFileSync(blobPath);

    const targetPath = path.join(process.cwd(), file);
    const folder = path.dirname(targetPath);

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    fs.writeFileSync(targetPath, fileContent);
  }

  // index를 commit 스냅샷으로 재작성
  const newIndexContent = Object.entries(commitFiles)
    .map(([filepath, hash]) => `${hash} ${filepath}`)
    .join('\n');

  fs.writeFileSync(indexPath, newIndexContent, 'utf-8');

  console.log(`브랜치가 ${branchName}으로 체크아웃 되었습니다.`);
  console.log(`현재 커밋: ${commitHash}\n`);
  console.log('워킹 디렉토리가 복원되었습니다.');
}

module.exports = checkout;
