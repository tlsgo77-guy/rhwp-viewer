# Changelog

## [0.4.0] - 2026-03-31

### 수정

- Fixed 줄간격 TAC 표의 pagination overflow 수정 (#9)
- 비-TAC 어울림 그림의 pagination 높이 반영 (#10)
- TAC 표 line_end 보정에서 ls 이중 추가 제거 (#10)
- HWPX 하이퍼링크 필드의 char_shape 매핑 수정 (#11)
- HWPX 표 속성 UI 바인딩: table.common 필드 직접 사용
- 문단 간격 UI 바인딩: 원본 HWPUNIT 값 사용 (/2.0 제거)
- TAC 표 혼합 문단의 pagination 높이 이중 계산 수정 (#19)
- 강제 줄넘김(Shift+Enter) 후 TAC 표의 ComposedLine 분리 (#20)
- composer: LINE_SEG lh에 표 높이가 포함된 텍스트 줄을 th로 보정

## [0.3.0] - 2026-03-30

### 수정

- HWPX switch/case 네임스페이스 분기 처리 (문단 간격/줄간격 정확도 개선)
- 고정값 줄간격에서 TAC 표와 문단의 병행 배치 지원

## [0.2.0] - 2026-03-30

### 수정

- 셀 내 TAC 이미지가 수평으로 나열되던 문제 수정 (LINE_SEG 기반 수직 배치)
- 비-TAC 그림(어울림 배치) 높이가 후속 요소에 미반영되던 문제 수정

### 추가

- cellzoneList 셀 영역 배경 지원 (이미지/단색/그라데이션, HWP+HWPX)
- imgBrush mode="TOTAL" 파싱 지원

## [0.1.0] - 2026-03-29

### 추가

- HWP/HWPX 파일 읽기 전용 뷰어 (CustomReadonlyEditorProvider)
- Canvas 2D 기반 문서 렌더링 (WASM)
- 가상 스크롤 (on-demand 페이지 렌더링/해제)
- Ctrl+마우스 휠 줌 (0.25x ~ 3.0x, 커서 앵커 기준)
- 상태 표시줄 UI (페이지 네비게이션 + 줌 컨트롤)
- 문서 내 이미지 지연 재렌더링
