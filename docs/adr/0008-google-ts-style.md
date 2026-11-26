# Google TypeScript 스타일은 Biome로만 강제한다

TypeScript 문체는 [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)를 따른다. 검사기는 Biome 하나다. ESLint를 더하면 같은 규칙을 두 곳에서 켜게 되고, 가이드 문장 중 Biome가 표현하지 못하는 것은 어차피 남아 있다. 그 목록과 켠 규칙의 대응은 [CODING_STANDARDS.md](../../CODING_STANDARDS.md)에 둔다.

포매터는 그대로다. 스페이스 2칸, 줄 너비 100, 큰따옴표는 가이드와 충돌하지 않는다. 세미콜론은 Biome 기본값인 `always`라서, ASI에 기대지 말라는 문장을 이미 맞춘다.

파일명을 가이드의 `snake_case`로 바꾸지 않는다. 템플릿 경로가 kebab-case로 README와 스킬에 적혀 있다. 객체 리터럴 키도 camelCase만 요구하지 않는다. Config File의 `ENVIRONMENTS`, Environment Setting 이름, OAuth 필드는 외부 계약이라 이름을 바꾸면 동작이 바뀐다. Biome는 키마다 “외부 계약” 예외를 줄 수 없어서, 리터럴 키는 `camelCase`·`CONSTANT_CASE`·`snake_case`를 모두 허용한다. `strictCase`는 끈다. 켜면 Node의 `isTTY`까지 걸리는데, 플랫폼 이름만 빼는 설정이 없다.

`tsup`와 Vitest는 default export를 요구한다. `*.config.ts`에서만 `noDefaultExport`를 끈다.
