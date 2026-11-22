# are-you-happy-cli

Agent Skill에서 호출하는 CLI의 샘플. 가상의 API(are.you.happy.cli)에 **Access Token**을 보내 이름에 대한 **Mood**를 받아온다. 이후 **Sample Action**을 걷어내고 다른 CLI의 템플릿으로 재사용한다.

## Language

### 정체성

**Project Keyword**:
CLI를 식별하는 단일 문자열(`are-you-happy-cli`). 실행 파일명, **Config File** 폴더명, 환경변수 접두사(`ARE_YOU_HAPPY_CLI_`)가 모두 여기서 파생된다.
_Avoid_: app name, CLI name, prefix

### 설정

**Config File**:
사용자별로 하나 존재하는 `config.json`. `$XDG_CONFIG_HOME`이 있으면 `$XDG_CONFIG_HOME/<Project Keyword>/` 아래, 없으면 `$HOME/.<Project Keyword>/` 아래에 있다. **Sample Action**은 이것이 없으면 실행되지 않는다.
_Avoid_: settings file, rc file

**Environment Setting**:
**Project Keyword** 접두사를 가진 환경변수 형태의 설정값(예: `ARE_YOU_HAPPY_CLI_LANG`). 셸 환경, `.env`, **Config File**의 `ENVIRONMENTS` 노드 어디에서든 올 수 있다.
_Avoid_: env config, option

**File-only Setting**:
**Config File**의 `ENVIRONMENTS` 밖에만 존재하고 환경변수로는 지정할 수 없는 설정값(예: `mode`).
_Avoid_: extra config, custom setting

**Language Pack**:
한 언어에 대한 CLI의 모든 사용자 노출 문자열 묶음. 선택 가능한 언어는 **Language Pack**이 존재하는 언어뿐이다.
_Avoid_: locale file, translation

### 인증

**Client Credentials**:
사용자가 발급받아 등록하는 Client ID와 Client Secret의 쌍. 현재 폴더의 `.env`에 저장된다.
_Avoid_: API key, login

**Access Token**:
**Client Credentials**로 발급받는, API 호출 시 제시하는 토큰. 이 CLI에서는 고정 문자열 `it.me.and.you`이며 다른 값은 401로 거부된다. 만료 시각(TTL)을 가진다.
_Avoid_: session, API key, JWT

**Refresh Token**:
만료된 **Access Token**을 **Client Credentials** 없이 다시 받기 위해 함께 발급되는 토큰.
_Avoid_: renewal key

**Token State**:
사용자별로 저장된 **Access Token**, **Refresh Token**, 만료 시각, 그리고 발급에 쓰인 Client ID의 묶음. 발급에 쓰인 Client ID가 현재 **Client Credentials**와 다르면 무효다.
_Avoid_: token cache, session, credentials file

### 샘플 도메인

**Mood**:
API가 이름 하나에 대해 무작위로 돌려주는 다섯 가지 기분 상태(happy, sad, angry, excited, tired) 중 하나.
_Avoid_: feeling, emotion, status

**Sample Action**:
템플릿으로 재사용할 때 삭제 대상인 `action` 그룹의 명령(현재 `are-you`). 인증과 설정 로직은 여기에 속하지 않는다.
_Avoid_: demo command, example
