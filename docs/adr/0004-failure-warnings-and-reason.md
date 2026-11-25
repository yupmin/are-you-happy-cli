# 실패 봉투는 경고를 남기고, 언어와 무관한 reason을 둔다

스펙은 json 실패에 대해 한 문장에서 "`data: null`"과 "경고는 `data.warnings`"를 같이 말했다. 구현은 `data: null`을 택해, 실패 전에 쌓인 경고(느슨한 파일 권한, 지원하지 않는 언어의 폴백)를 봉투에서 지웠다. 에이전트가 봉투를 읽는 시점이 실패다.

또 복구 절차는 `message`의 영어 문장(`Config File is not valid`, `Token State is not valid`)을 찾았다. 한국어 Language Pack에는 그 문장이 없다.

이 ADR은 그 문장을 다음으로 바꾼다. `action`의 json 실패 봉투는 `{ code, message, reason, data }`이고, `data`는 `{ warnings }`다. `warnings`는 성공 때와 같은 자리에 있으며, 실패 전에 나온 경고를 비우지 않는다. `reason`은 언어와 무관한 코드다. `message`는 사람에게 보여줄 번역문이다.

`reason`의 목록은 `src/errors.ts`의 `REASON`과 `docs/spec.md`가 함께 가진다. text 모드(`config`, `auth`, `--format text`)는 사람에게 주는 출력이므로 `reason`을 찍지 않는다. 에이전트는 `action --format json`의 `reason`으로 복구를 고른다.

성공 봉투는 그대로 `{ code, message, data }`이고 `reason`이 없다. 오류를 stdout 한 곳으로 모으는 [ADR-0001](0001-json-envelope-on-stdout.md)은 유지한다.
