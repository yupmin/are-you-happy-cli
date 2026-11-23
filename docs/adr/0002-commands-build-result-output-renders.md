# commands는 결과를 만들고, 출력은 Output 한 곳이 담당한다

스펙 초안은 "`commands/`: 인자 파싱만, 출력은 renderer가 담당"이었다. 실제로는 별도 renderer 계층을 두지 않는다. 각 명령은 인자를 파싱하고, 흐름(프롬프트·확인·저장)을 진행한 뒤, 결과를 `ctx.result = { message, data, text? }`로 남긴다(`data`는 json 봉투가 있는 `action` 그룹만, [ADR-0003](0003-format-only-for-action.md)). 그것을 text·json 봉투(ADR-0001)로 내보내는 일은 `src/output.ts`의 `Output` 한 곳이 한다. `text`는 사람용 표시가 `message`와 달라야 할 때만 명령이 채운다(예: `action are-you`의 Language Pack 형식 시각).

명령마다 renderer를 따로 두면 템플릿을 고쳐 쓰는 사람이 파일을 두 배로 따라가야 하는데, 출력 형식은 이미 `Output`이 통일하므로 얻는 것이 적다. 명령 사이에 공유되는 로직(토큰 흐름, API 오류 매핑, 설정 해석)은 `services/`·`settings/`로 뺀다.
