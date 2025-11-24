const fs = require('fs');
const path = require('path');
const branch = require('../commands/branch.js');

describe('branch 명령어 테스트', () => {
  const repoPath = path.join(process.cwd(), '.dvcs');
  const headPath = path.join(repoPath, 'HEAD');
  const refsPath = path.join(repoPath, 'refs', 'heads');

  beforeEach(() => {
    // 기존 테스트 환경 삭제
    if (fs.existsSync(repoPath)) fs.rmSync(repoPath, { recursive: true });

    // .dvcs 구조 생성
    fs.mkdirSync(path.join(repoPath, 'refs', 'heads'), { recursive: true });
  });

  test('이미 존재하는 브랜치일 경우 메시지 출력', () => {
    fs.writeFileSync(headPath, 'abcdef123456');
    fs.writeFileSync(path.join(refsPath, 'main'), 'abcdef123456');

    console.log = jest.fn();
    branch('main');

    expect(console.log).toHaveBeenCalledWith('이미 존재하는 브랜치입니다.');
  });

  // HEAD가 비어 있는 경우
  test('HEAD가 비어 있으면 브랜치를 생성할 수 없음', () => {
    fs.writeFileSync(headPath, '');

    console.log = jest.fn();
    branch('feature');

    expect(console.log).toHaveBeenCalledWith(
      '현재 HEAD가 비어 있습니다. 커밋 후 브랜치를 생성하세요.'
    );
  });

  test('HEAD가 브랜치를 가리킬 때, 새 브랜치는 현재 커밋을 가리킴', () => {
    fs.writeFileSync(headPath, 'ref: refs/heads/main\n');

    // main 브랜치가 가리키는 커밋
    fs.writeFileSync(path.join(refsPath, 'main'), 'aaa111bbb222');

    // 브랜치 생성
    branch('dev');

    const devBranchPath = path.join(refsPath, 'dev');
    const commit = fs.readFileSync(devBranchPath, 'utf-8').trim();

    expect(commit).toBe('aaa111bbb222');
  });

  test('detached HEAD 상태에서는 HEAD의 해시로 브랜치가 생성됨', () => {
    fs.writeFileSync(headPath, 'deadbeef1234567890');

    // 브랜치 생성
    branch('hotfix');

    const hotfixPath = path.join(refsPath, 'hotfix');
    const commit = fs.readFileSync(hotfixPath, 'utf-8').trim();

    expect(commit).toBe('deadbeef1234567890');
  });

  // 브랜치 생성 성공 메시지
  test('브랜치 생성 시 성공 메시지 출력', () => {
    fs.writeFileSync(headPath, 'ref: refs/heads/main\n');
    fs.writeFileSync(path.join(refsPath, 'main'), 'a1b2c3d4');

    console.log = jest.fn();
    branch('newbranch');

    expect(console.log).toHaveBeenCalledWith(
      '새 브랜치인 newbranch가 생성되었습니다.'
    );
  });
});
