# 수류탄 던지기 (1인칭 3D 프로토타입)

**1인칭 시점**에서 아래→위로 스와이프해 수류탄을 던지고, 벽 뒤에 숨은 적을
폭발 범위로 처치하는 모바일 웹 게임.

**Three.js + Rapier(3D 물리, WASM) + TypeScript + Vite.**

## 실행

패키지 매니저는 **pnpm** 을 사용합니다.

```bash
pnpm install
pnpm dev      # http://localhost:5173 (--host 로 LAN 노출됨)
pnpm build    # tsc 체크 + dist/ 빌드
pnpm preview  # 빌드 결과 미리보기
```

### 실기기(모바일 브라우저) 테스트
`pnpm dev` 실행 시 터미널에 표시되는 `Network:` 주소를
같은 Wi-Fi 의 폰 브라우저에서 열면 됨. WebGL2 지원 브라우저 필요.

## 조작

- 화면을 **아래에서 위로 스와이프** → 그 방향/속도로 수류탄 발사
  - **세로 성분** = 던지는 올려각 + 파워, **가로 성분** = 좌우 조준각
  - 파워 = (정규화 스와이프 거리 / 시간) 속도 기반 → 화면 크기 독립
  - 위로 충분히(`SWIPE.minUp`) 스와이프하지 않으면 무시 (원본 `dy<0` 규칙)
- 스와이프 중 3D 포물선 궤적을 점으로 미리보기
- **쿠킹**: 화면을 누르는 순간부터 신관(기본 3초)이 흐르고, 옆 게이지가 하단→상단으로 참.
  던진 뒤에도 시계는 계속 흘러 신관이 다하면 폭발 → **공중 폭발 타이밍 조절 가능**.
  끝까지 안 던지면 손에서 폭발(수류탄 소모).
- **스플래시 반경 내 적은 벽에 가려도 사망** (raycast 시야 판정 안 씀 — 순수 거리)

## 튜닝

모든 밸런싱 상수는 [`src/config/constants.ts`](src/config/constants.ts) 한 곳에:

| 블록 | 용도 |
|---|---|
| `RENDER` / `CAMERA` | FOV, 톤매핑 노출, 지수 안개, 기본 카메라 위치/시선 |
| `SKY` | 태양 고도/방위, 하늘 탁도/산란, 태양광·IBL·반구광 세기 |
| `PHYSICS` | 중력, 고정 스텝, 수류탄 물성(담핑으로 구르는 정도 조절) |
| `SWIPE` | 최소 거리/시간, `powerScale`, 발사 속도 클램프, `yawRange`/`pitchRange` |
| `COOK` | `durationMs`(신관 총 시간=게이지 참 시간), `dangerFrom`(위험색 임계), `cookOffInHand` |
| `EXPLOSION` | `splashRadius`, `particleCount`, 카메라 흔들림 |
| `TRAJECTORY` | 미리보기 점 개수/간격 |
| `GAMEPLAY` | 스테이지당 수류탄 수, 별점 기준 |

## 레벨

[`src/levels/levels.ts`](src/levels/levels.ts) 에 정의 (벽 position/size, 적 position, 수류탄 수).
좌표계는 3D: **+X 오른쪽, +Y 위, -Z 정면**. 플레이어는 z≈6, 적/벽은 음의 z.
바닥은 y=0. 나중에 레벨 에디터로 확장 가능.

## 구조

```
src/
  main.ts                 Rapier init → Game 부트스트랩
  core/
    Game.ts               WebGLRenderer + 렌더 루프 + 씬 전환/네비게이션
    Scene.ts              GameScene 인터페이스
  config/       constants.ts (튜닝값), types.ts
  levels/       levels.ts (스테이지 5개, 3D 좌표)
  input/        SwipeController.ts (스와이프 → 3D 발사 벡터, 카메라 기준)
  gameplay/
    PhysicsWorld.ts       Rapier 월드 래퍼 (고정 스텝 누적)
    Environment.ts        절차적 하늘(Sky)+태양+IBL+지수안개+절차적 지형 (배그풍 톤)
    Grenade / Enemy / Wall
    TrajectoryPreview.ts  해석적 포물선 적분 → InstancedMesh 점
    ExplosionSystem.ts    거리 기반 스플래시 + 파티클 + 섬광 + 카메라 흔들림
    ScoreSystem.ts        별점 계산
  scenes/       MenuScene / LevelSelectScene / GameScene / ResultScene
  ui/           overlay.ts (DOM 오버레이 UI 헬퍼 — 메뉴/HUD)
  utils/        three.ts (카메라/정리 헬퍼), storage.ts (진행도),
                procedural.ts (캔버스 지형 텍스처 생성)
```

메뉴/스테이지 선택/결과 화면은 3D 씬 위에 **HTML DOM 오버레이**(`#ui`)로 UI를 그림.
게임플레이 HUD(수류탄/적 수, 크로스헤어)도 동일.

## Capacitor (iOS 래핑, 나중 단계)

[`capacitor.config.ts`](capacitor.config.ts) 준비됨. iOS 앱 빌드:

```bash
pnpm add @capacitor/core @capacitor/cli @capacitor/ios
pnpm build
pnpm exec cap add ios
pnpm cap:sync
pnpm cap:ios      # Xcode 에서 실행
```

라이브 리로드로 실기기 테스트하려면 `capacitor.config.ts` 의 `server.url` 을
dev 서버 주소로 설정.

> 참고: Rapier WASM 이 base64 로 번들되어 빌드 결과 JS가 큼(~3.4MB). 프로토타입 단계에선 무시.
