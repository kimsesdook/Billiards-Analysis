# Billiards Frontend

당구 경기 기록 서비스의 React 프론트엔드입니다. Spring Boot 백엔드 API와 연동해서 회원가입, 로그인, 경기 기록 조회/생성/수정/삭제를 처리합니다.

## 기술 스택

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router

## 실행 방법

1. 의존성 설치

```bash
npm install
```

2. 환경 변수 설정

`.env.example`을 참고해서 `.env.local`을 만들고 백엔드 주소를 설정합니다.

```bash
VITE_API_BASE_URL="http://localhost:8080"
```

백엔드를 다른 포트로 실행했다면 해당 포트에 맞춰 바꿉니다.

```bash
VITE_API_BASE_URL="http://localhost:18080"
```

3. 개발 서버 실행

```bash
npm run dev
```

4. 타입 체크

```bash
npm run lint
```

5. 프로덕션 빌드 확인

```bash
npm run build
```

## 인증 연동

- 로그인 성공 시 백엔드가 내려준 JWT를 `localStorage`에 저장합니다.
- 저장 시점과 만료 시점을 함께 저장해서 만료된 세션은 자동으로 제거합니다.
- 보호된 API에서 `401 Unauthorized`가 오면 로그인 상태를 정리하고 로그인 화면으로 이동합니다.
- 일반 API 요청에는 `Authorization: Bearer <token>` 헤더를 자동으로 붙입니다.
