# DVCS (Distributed Version Control System)
> Git의 내부 동작을 이해하기 위해 구현한 분산형 버전 관리 시스템

## 목차
- [프로젝트 소개](#프로젝트-소개)
- [프로젝트 목표](#프로젝트-목표)
- [주요 구현 기능 목록](#주요-구현-기능-목록)
- [프로젝트 구조](#프로젝트-구조)
- [버전 관리 시 생성되는 .dvcs 내부 구조](#버전-관리-시-생성되는-dvcs-내부-구조)
- [설치 및 실행 방법](#설치-및-실행-방법)
- [명령어 상세 설명](#명령어-상세-설명)
- [테스트 실행 방법](#테스트-실행-방법)
- [배운 점](#배운-점)

---

## 프로젝트 소개
이 프로젝트는 Git의 내부 동작을 제대로 이해하기 위해 직접 만든 분산 버전 관리 시스템(DVCS) 입니다.

> **왜 버전 관리 시스템을 프로젝트로 선택하게 되었을까?**

프리코스 기간 동안 매일 과제를 제출하면서 `git add`, `git commit`, `git push` 등등 깃 명령어들을 수십 번 반복했습니다.
처음에는 단순히 제 코드를 GitHub 레포지토리에 올리기 위한 절차라고만 생각했습니다.  

하지만 시간이 지나면서 점점 의문이 생기게 되었습니다.

- 코드는 어떻게 관리되는 걸까? 이전 기록과 비교하여 새로 생성된 코드를 덮어씌우는 걸까?
- git add를 하면 실제로 파일은 어디에 저장되는 걸까?
- git commit은 어떤 방식으로 이전 버전과 연결될까?
- 버전 기록을 할 때마다 코드가 바뀌는데, 그 많은 기록들은 어디에 저장되어 있을까?
- 변경된 기록들을 어떻게 하나하나 파악할 수 있을까?

이런 궁금증이 쌓이면서 단순히 Git을 사용하는 것을 넘어 Git이 내부적으로 어떻게 동작하는가를 직접 이해해보고 싶었습니다.  
마침 오픈 미션을 통해 자유롭게 주제를 정할 수 있었고, Git의 내부 구조를 직접 구현하며 그 원리를 체득해보고자 이 프로젝트를 시작하게 되었습니다.

---

## 프로젝트 목표
이 프로젝트를 시작하며 다음과 같은 구체적인 목표를 세웠습니다.

- [x] Git의 동작 원리를 완벽하게 이해하고, 동일한 구조를 직접 구현해 실제로 버전 관리를 수행할 수 있는 수준의 기능을 만들어보자.
- [x] 왜 커밋은 스냅샷인지 고민해보며, Git의 설계 선택이 최적의 방법인지 직접 검증해보자.
- [x] Git의 객체 기반 저장 구조를 구현해보고 불변성과 해시 기반 무결성의 의미를 이해해보자.
- [x] 브랜치, HEAD, refs 개념을 직접 구현하여 포인터 기반 버전 관리 기능을 직접 만들어보자.

>그 중 가장 큰 목표는 **브랜치와 포인터 구조를 직접 구현하며,**
>**HEAD가 어떻게 브랜치를 가리키고,**
>**각 브랜치가 어떻게 서로 독립적인 히스토리를 갖는지를 코드로 구현하는 것**이었습니다.

---

## 주요 구현 기능 목록

### 1. 저장소 초기화 및 내부 구조 생성 — `init`
- `.dvcs` 디렉토리를 생성하고, 그 안에 커밋과 객체 해시를 관리하기 위한 HEAD, objects, refs/heads 디렉토리 구조를 자동으로 만들었습니다.
- HEAD가 기본 브랜치인 master를 가리키도록 설정하였습니다.

### 2. Blob 객체 생성 + 스테이징 된 파일을 관리한는 Index 영역 관리 — `add`
- 파일 내용을 읽고 SHA-1 해시를 생성하여 Blob객체로 저장하였습니다.
- objects/XX/XXXX… 형식으로 해시의 앞 2글자는 폴더로, 나머지는 파일명으로 설정하여 효율적인 디렉토리 구조와 해시 기반 불변성을 구현하였습니다.
- 해당 파일의 해시를 index 파일에 기록하며, 스테이징 영역과 Working Directory의 차이를 명확히 구현했습니다.

### 3. Tree + Commit 생성 — `commit`
- index에 기록된 파일 목록을 기반으로 Tree 객체인 폴더 스냅샷을 생성하였습니다.
- tree 해시를 기반으로 Commit 객체를 생성하였습니다.
- `refs/heads/<branch>`의 포인터 내용을 새로운 commit으로 갱신하였습니다.

### 4. 버전 상태 확인 — `status`
- Working Directory와 index, commit 스냅샷을 비교하여 현재 파일 상태를 출력했습니다.

### 5. Commit 로그 출력 — `log`
- parent commit을 역추적하며 로그를 출력하였습니다.
- 해시 기반 commit 체인이 어떻게 이어지는지 구조적으로 이해했습니다.

### 6. 브랜치 생성 — `branch`
- `refs/heads/`경로에 새로운 branch 브랜치명 파일을 만들고 해당 파일에 현재 commit hash를 저장하는 방식으로 구현했습니다.

### 7. 브랜치 이동 + 작업 디렉토리 복원 — `checkout`
- HEAD가 가리키는 포인터를 해당 브랜치의 포인터로 변경하였습니다.
- 해당 브랜치의 commit tree를 바탕으로 파일들을 Working Directory에 복원하였습니다.
- 아직 커밋되지 않은 내용이 있으면 checkout을 차단하였습니다.

### 8. 병합 알고리즘 구현 — `merge`
- 하나의 브랜치가 다른 브랜치의 부모인 경우 fast-forward merge을 구현하였습니다.
- 두 브랜치가 부모-자식 관계가 아닌 경우 2-way merge 방식을 구현하였습니다.
- 공통 조상을 활용한 3-way merge를 시도하였습니다.
- 병합 완료 후에는 새로운 merge commit을 생성하도록 구현하였습니다.

### 9. 특정 커밋으로 이동 — `reset`
- 브랜치 포인터를 복원할 특정 커밋 해시로 이동시켰습니다.
- Working Directory의 파일도 해당 스냅샷으로 복원하였습니다.

---

## 프로젝트 구조
```
distributed-version-control-system
 ┣ .dvcs
 ┣ commands
 ┃ ┣ add.js
 ┃ ┣ branch.js
 ┃ ┣ checkout.js
 ┃ ┣ commit.js
 ┃ ┣ init.js
 ┃ ┣ log.js
 ┃ ┣ merge.js
 ┃ ┣ reset.js
 ┃ ┗ status.js
 ┣ tests
 ┃ ┣ add.test.js
 ┃ ┣ branch.test.js
 ┃ ┣ checkout.test.js
 ┃ ┣ commit.test.js
 ┃ ┣ init.test.js
 ┃ ┣ log.test.js
 ┃ ┣ merge.test.js
 ┃ ┣ reset.test.js
 ┃ ┗ status.test.js
 ┣ utils
 ┃ ┗ sha1.js
 ┣ .gitignore
 ┗ dvcs.js
```

---

## 버전 관리 시 생성되는 .dvcs 내부 구조
분산형 버전 관리 시스템의 원리를 참고하여 `.dvcs` 디렉토리를 구성하고,  
Blob, Tree, Commit 객체를 `objects/` 아래에 저장하는 구조로 구현했습니다.

```bash
.dvcs
 ┣ objects
 ┃ ┗ e1
 ┃ ┃ ┗ f2fb3c234b8a7353a14cbf5ba5508492a44093..  (blob, tree, commit 등 저장)
 ┣ refs
 ┃ ┣ heads
 ┃ ┃ ┗ master
 ┃ ┗ tags
 ┣ HEAD
 ┗ index
```

###  .dvcs 내부 객체 구조
<img width="321" height="503" alt="image" src="https://github.com/user-attachments/assets/cbb05c68-23af-45c3-88d8-3c77ea9ae1e4" />

#### 1. Blob
파일의 내용 그 자체를 SHA-1 함수를 통해 해싱하여 저장합니다.

#### 2. Tree
한 시점의 디렉토리 스냅샷을 기록합니다.
commit 시에 폴더 구조 + 파일명 + blob 해시가 기록된 객체를 생성합니다.

#### 3. Commit
Tree를 해시화한 값, parent 해시값, 브랜치의 최신 상태 등을 나타냅니다.

#### 4. HEAD / refs
HEAD에는 현재 브랜치가 기록되어 있습니다.
refs/heads/.. 현재 브랜치의 최신 커밋 해시를 저장합니다.

---

## 설치 및 실행 방법
### 설치 조건
- Node.js 22.19.0 버전에서 실행 가능해야 합니다.
- 모든 명령어는 터미널(Command Line)에서 실행합니다.

### 설치 및 실행 방법

1. 해당 저장소를 클론합니다.
```
git clone https://github.com/janghw0126/distributed-version-control-system.git
```

2. 의존성을 설치합니다.
```
npm install
```

3. 각 명령어를 실행합니다.
```
node dvcs.js <command> <args>
```

자세한 실행 방법은 아래 **명령어 상세 설명**을 참고해주세요!

---

## 명령어 상세 설명
### 1. init

저장소를 초기화하고, 버전 관리를 위한 .dvcs 디렉토리가 생성됩니다.
```
node dvcs.js init
```

**출력 예시:**
```
.dvcs/ 폴더가 생성되었고, 버전 관리를 위한 기본 구조가 준비되었습니다.
```
<img width="1307" height="50" alt="image" src="https://github.com/user-attachments/assets/1dbc8e05-44d4-4063-a935-facff779c2ed" />

### 2. add

해당 파일을 버전 관리에 포함시키기 위해 스테이징 영역에 올립니다.  
파일을 읽어 Blob 객체를 생성하고, 이를 커밋 준비를 위해 index 파일에 기록합니다.
```
node dvcs.js add <file>
```

**출력 예시:**
```
새로운 파일이 스테이지에 추가되었습니다.
```
<img width="1407" height="55" alt="image" src="https://github.com/user-attachments/assets/ec99c331-081c-49f7-ae1e-24e13582ac25" />

### 3. commit

index를 기반으로 tree 객체와 commit 객체를 생성하고 브랜치에 최신 커밋을 갱신합니다.
```
node dvcs.js commit "message"
```

**출력 예시:**
```
새 커밋이 생성되었습니다. 804c9ff94706862c34301ca9b73c916aa006c229
```
<img width="1453" height="77" alt="image" src="https://github.com/user-attachments/assets/73c6cf82-27ff-42d9-9340-58de952fed3b" />

### 4. status

워킹디렉토리와 index, commit을 비교해 상태를 출력합니다.
```
node dvcs.js status
```

**출력 예시:**
```
Current Branch : master
Current Commit: 804c9ff94706862c34301ca9b73c916aa006c229

Changes to be committed:
  a.txt

Untracked files:
  .gitignore
  dvcs.js
  file.txt
  hompage
  junseo
  package-lock.json
  package.json
```
<img width="1344" height="362" alt="image" src="https://github.com/user-attachments/assets/05459b9c-fcb6-472b-a28c-0b1d13e3a83d" />

### 5. log

현재 브랜치의 commit parent를 따라 이전 커밋의 기록들을 출력합니다.
```
node dvcs.js log
```

**출력 예시:**
```
commit - cb5a0832ba64ae39-3afd4138f1bef4a477630ac
commit message - homepage 업로드

commit - 8b06d6327bf3123f54ca12ec398038cad0bb4ea9
commit message - a.txt 업로드

commit - 804c9ff94706862c34301ca9b73c916aa006c229
commit message - feat: 첫 커밋
```
<img width="1334" height="227" alt="image" src="https://github.com/user-attachments/assets/2ed2b0f1-bb1d-40c2-89ed-d290101ea5eb" />

### 6. branch

새로운 브랜치를 생성합니다.
```
node dvcs.js branch <branchname>
```

**출력 예시:**
```
새 브랜치인 login가 생성되었습니다.
```
<img width="1411" height="54" alt="image" src="https://github.com/user-attachments/assets/6fa43b95-fd8a-4cb7-906e-7d0a13c7774a" />

### 7. checkout

브랜치를 이동시키고, 워킹 디렉토리를 복원합니다.
```
node dvcs.js checkout <branchname>
```

**출력 예시:**
```
브랜치가 login으로 체크아웃 되었습니다.
현재 커밋: cb5a0832ba64ae39-3afd4138f1bef4a477630ac

워킹 디렉토리가 복원되었습니다.
```
<img width="1413" height="120" alt="image" src="https://github.com/user-attachments/assets/957c4336-3324-4409-80bd-c0da4206bd0d" />

### 8. merge

다른 브랜치의 변경사항을 현재 브랜치에 병합합니다.
```
node dvcs.js merge <branchname>
```

**출력 예시:**
```
현재 브랜치 커밋: cb5a0832ba64ae39-3afd4138f1bef4a477630ac
병합할 브랜치 커밋: c45c092ebc62a83c-5a3d115aefacfea44812dad
Fast-forward merge를 수행 중입니다.
Fast-forward: 현재 브랜치가 'master' 브랜치의 최신 커밋으로 이동했습니다.
```
<img width="1437" height="111" alt="image" src="https://github.com/user-attachments/assets/fb54db62-daec-484e-94eb-fb357b2fad8c" />

### 9. reset

특정 커밋으로 다시 히스토리를 복원합니다.
```
node dvcs.js reset <commitHash>
```

**출력 예시:**
```
브랜치가 cb5a0832ba64ae39-3afd4138f1bef4a477630ac로 이동했습니다.
```
<img width="1454" height="73" alt="image" src="https://github.com/user-attachments/assets/73548885-6019-477b-b239-d77a62ed10f9" />

---

## 테스트 실행 방법
Jest를 이용하여 각각의 명령어들이 잘 실행되었는지 확인하였습니다.

**테스트 디렉토리 구조**
```
tests
 ┣ add.test.js
 ┣ branch.test.js
 ┣ checkout.test.js
 ┣ commit.test.js
 ┣ init.test.js
 ┣ log.test.js
 ┣ merge.test.js
 ┣ reset.test.js
 ┗ status.test.js
```
**실행방법:**
```
npm run test
```

**출력 예시:**

<img width="300" height="300" alt="image" src="https://github.com/user-attachments/assets/6ccfed2b-1545-435c-935a-767996dc7713" />
<img width="300" height="300" alt="image" src="https://github.com/user-attachments/assets/83f08ace-6634-4bb7-9715-4a50bd891aa8" />

--- 

## 배운 점

- Git이 이전 내용들을 수정해서 업데이트하는 diff 방식이 아닌 스냅샷 방식으로 버전을 관리한다는 점을 직접 구현하며 확실히 이해할 수 있었습니다. 특히 같은 파일이라도 내용이 동일하다면 동일한 SHA-1 해시로 저장되는 구조가 인상적이었고, 이러한 불변성 기반 모델이 실제로 Git의 속도와 안정성을 만들어낸다는 사실을 체감했습니다.

- merge의 동작 원리를 이해하게 되었습니다. Fast-forward merge는 성공적으로 구현했으나, 공통 조상 기반의 3-way merge는 구현 난이도가 높아 완전히 구현하지 못했습니다. 하지만 3-way merge 시도 과정에서 Git 내부 알고리즘의 복잡성을 깊이 이해할 수 있었습니다.

- index(스테이징 영역)가 존재하는 이유를 알게 되었습니다.

---

## 향후 개선 목표
**1. 코드 리팩토링**
- 공통 조상 기반의 3-way merge 병합 코드를 완성할 계획입니다.
- 공통 코드를 모듈로 분리하고 클래스 기반 구조로 전환하여 유지보수성을 향상시킬 계획입니다.
- 엣지 케이스 및 통합 테스트를 추가할 계획입니다.

**2. 원격 저장소 연동**
- npm 패키지로 배포하여 `dvcs` 명령어로 전역으로 사용 가능하도록 개선할 계획입니다.
- push/pull 구현을 통한 협업 기능을 추가할 계획입니다.

**3. 상세 기능 구현**
- 병합 시 충돌이 발생했을 때 더 직관적으로 해결할 수 있는 UI를 구현할 계획입니다.
- 한 브랜치의 커밋을 다른 브랜치 위로 재정렬하는 기능 추가할 계획입니다. (rebase 명령어 구현)
- 파일이 많아져도 빠르게 동작하도록 최적화할 계획입니다.
