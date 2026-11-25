# Matt Pocock skills

Cursor 에이전트가 이 저장소에서 쓰는 프로젝트 스킬이다. skills.sh가 Cursor에 권하는 프로젝트 복사(`npx skills@latest add mattpocock/skills -a cursor -s '*' -y --copy`)와 같은 파일이다. 각 스킬의 `SKILL.md`와 보조 파일을 그대로 둔다.

위치는 `.cursor/skills/<skill-name>/` 하나다. 지금 skills CLI는 Cursor **프로젝트** 스킬을 `.agents/skills`에 쓴다. 두 경로를 같이 두면 같은 스킬이 두 번 로드되므로 이 디렉터리만 둔다.

## Upstream

- 저장소: https://github.com/mattpocock/skills
- 커밋: `d65391149dbb5fe76478e76fa8d5122b2aa5a70e`
- 라이선스: MIT. Copyright (c) 2026 Matt Pocock. 전문은 [LICENSE](./LICENSE).

## Skills

### engineering

- `ask-matt`
- `code-review`
- `codebase-design`
- `diagnosing-bugs`
- `domain-modeling`
- `grill-with-docs`
- `implement`
- `implement-spec`
- `improve-codebase-architecture`
- `pr`
- `prototype`
- `research`
- `retro`
- `setup-matt-pocock-skills`
- `tdd`
- `to-spec`
- `to-tickets`
- `triage`
- `wayfinder`
- `wizard`

### productivity

- `grill-me`
- `grilling`
- `handoff`
- `teach`
- `to-questionnaire`
- `wait-what`
- `writing-for-agents`

### misc

업스트림에서 동결된 스킬이다. 플러그인에는 없다.

- `git-guardrails-claude-code`
- `migrate-to-shoehorn`
- `scaffold-exercises`
- `setup-pre-commit`

### in-progress

베타다. 플러그인과 업스트림 README의 승격 목록에는 없다. 예고 없이 바뀌거나 사라질 수 있다.

- `chief-of-staff`
- `claude-handoff`
- `loop-me`
- `setup-ts-deep-modules`
- `software-factory`
- `writing-beats`
- `writing-fragments`
- `writing-shape`

## 갱신

`npx skills update`는 `.agents/skills`와 `skills-lock.json`을 본다. 이 저장소는 그 둘을 두지 않는다. 갱신할 때는 위 커밋 이후의 `main`을 확인하고, `skills/<bucket>/<name>/`를 이 디렉터리의 같은 이름으로 다시 복사한 뒤 이 파일의 커밋 SHA를 고친다.
