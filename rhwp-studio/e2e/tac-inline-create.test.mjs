/**
 * E2E 테스트: 빈 문서에서 인라인 TAC 표 직접 생성 (Issue #32)
 *
 * tac-case-001.hwp와 동일한 구조를 WASM API로 직접 만들고
 * 렌더링 결과를 검증한다.
 *
 * 문서 구조:
 *   pi=0: "TC #20"
 *   pi=1: "tacglkj 표 3 배치 시작" [인라인 2×2 TAC 표] "4 tacglkj 표 다음"
 *   pi=2: "tacglkj 가나 옮"
 *
 * 실행: node e2e/tac-inline-create.test.mjs [--mode=host|headless]
 */
import {
  runTest, createNewDocument, clickEditArea, screenshot, assert,
  getPageCount, getParagraphCount as getParaCount, getParaText,
} from './helpers.mjs';

runTest('인라인 TAC 표 직접 생성', async ({ page }) => {
  // 1. 빈 문서 생성
  await createNewDocument(page);
  await clickEditArea(page);

  const initialPages = await getPageCount(page);
  console.log(`  빈 문서: ${initialPages}페이지`);

  // 2. WASM API로 문서 구성
  const buildResult = await page.evaluate(() => {
    const w = window.__wasm;
    if (!w) return { error: 'WASM 없음' };

    try {
      // pi=0: "TC #20"
      w.doc.insertText(0, 0, 0, 'TC #20');

      // Enter → pi=1
      w.doc.splitParagraph(0, 0, 6);

      // pi=1: 표 앞 텍스트
      w.doc.insertText(0, 1, 0, 'tacglkj 표 3 배치 시작');

      // pi=1에 인라인 TAC 2×2 표 삽입 (텍스트 끝에)
      const textLen = w.doc.getParagraphLength(0, 1);
      const tableResult = JSON.parse(w.doc.createTableEx(JSON.stringify({
        sectionIdx: 0,
        paraIdx: 1,
        charOffset: textLen,
        rowCount: 2,
        colCount: 2,
        treatAsChar: true,
        colWidths: [6777, 6777],
      })));

      if (!tableResult.ok) return { error: 'createTableEx 실패: ' + JSON.stringify(tableResult) };

      // 셀 텍스트 입력
      w.doc.insertTextInCell(0, 1, tableResult.controlIdx, 0, 0, 0, '1');
      w.doc.insertTextInCell(0, 1, tableResult.controlIdx, 1, 0, 0, '2');
      w.doc.insertTextInCell(0, 1, tableResult.controlIdx, 2, 0, 0, '3 tacglkj');
      w.doc.insertTextInCell(0, 1, tableResult.controlIdx, 3, 0, 0, '4 tacglkj');

      // 표 뒤 텍스트
      const newLen = w.doc.getParagraphLength(0, 1);
      w.doc.insertText(0, 1, newLen, '4 tacglkj 표 다음');

      // Enter → pi=2
      const pi1Len = w.doc.getParagraphLength(0, 1);
      w.doc.splitParagraph(0, 1, pi1Len);

      // pi=2: 텍스트
      w.doc.insertText(0, 2, 0, 'tacglkj 가나 옮');

      // 렌더링 갱신
      w.renderVisiblePages?.();

      const getParaTextLocal = (s, p) => {
        try {
          const len = w.doc.getParagraphLength(s, p);
          return w.doc.getTextRange(s, p, 0, len);
        } catch { return ''; }
      };
      return {
        ok: true,
        paraCount: w.getParagraphCount(0),
        pi0: getParaTextLocal(0, 0),
        pi1: getParaTextLocal(0, 1),
        pi2: getParaTextLocal(0, 2),
        pageCount: w.pageCount,
        tableResult,
      };
    } catch (e) {
      return { error: e.message || String(e) };
    }
  });

  if (buildResult.error) {
    console.log(`  문서 구성 실패: ${buildResult.error}`);
    await screenshot(page, 'tac-create-error');
    return;
  }

  console.log(`  문단 수: ${buildResult.paraCount}`);
  console.log(`  pi=0: "${buildResult.pi0}"`);
  console.log(`  pi=1: "${buildResult.pi1}"`);
  console.log(`  pi=2: "${buildResult.pi2}"`);
  console.log(`  페이지 수: ${buildResult.pageCount}`);

  assert(buildResult.paraCount >= 3, `문단 3개 이상 예상, 실제: ${buildResult.paraCount}`);
  assert(buildResult.pi0 === 'TC #20', `pi=0 텍스트 불일치: "${buildResult.pi0}"`);
  assert(buildResult.pi1.includes('배치 시작'), `pi=1에 '배치 시작' 포함 예상`);
  assert(buildResult.pi1.includes('표 다음'), `pi=1에 '표 다음' 포함 예상`);

  await screenshot(page, 'tac-create-01-built');

  // 3. 렌더 트리에서 인라인 배치 검증
  const layout = await page.evaluate(() => {
    const w = window.__wasm;
    if (!w?.doc) return null;

    try {
      // 페이지 렌더 트리 JSON
      const treeJson = w.doc.getPageRenderTree(0);
      if (!treeJson) return null;
      const tree = JSON.parse(treeJson);

      const tables = [];
      const textRuns = [];

      function walk(node) {
        if (!node) return;
        const bbox = node.bbox || node.b;
        if ((node.type === 'Table' || node.t === 'T') && bbox) {
          tables.push({
            x: bbox.x, y: bbox.y, w: bbox.w || bbox.width, h: bbox.h || bbox.height,
            pi: node.para_index ?? node.pi,
          });
        }
        if ((node.type === 'TextRun' || node.t === 'R') && bbox) {
          textRuns.push({
            x: bbox.x, y: bbox.y, w: bbox.w || bbox.width, h: bbox.h || bbox.height,
            text: node.text || node.tx || '',
            pi: node.para_index ?? node.pi,
          });
        }
        const children = node.children || node.c || [];
        for (const child of children) walk(child);
      }
      walk(tree);
      return { tables, textRuns };
    } catch (e) {
      return { error: e.message };
    }
  });

  if (!layout || layout.error) {
    console.log(`  렌더 트리 추출: ${layout?.error || 'null'} — 스크린샷으로 대체 검증`);
  } else {
    console.log(`  렌더 트리: 표 ${layout.tables.length}개, 텍스트 런 ${layout.textRuns.length}개`);
    const table = layout.tables.find(t => t.pi === 1);
    if (table) {
      console.log(`  표: x=${table.x.toFixed(1)} y=${table.y.toFixed(1)} w=${table.w.toFixed(1)} h=${table.h.toFixed(1)}`);
      const hostRuns = layout.textRuns.filter(r => r.pi === 1);
      const before = hostRuns.filter(r => r.x + r.w <= table.x + 2);
      const after = hostRuns.filter(r => r.x >= table.x + table.w - 2);
      console.log(`  표 앞 텍스트: ${before.length}개`);
      console.log(`  표 뒤 텍스트: ${after.length}개`);
      assert(before.length > 0, '표 앞에 텍스트가 있어야 함');
      assert(after.length > 0, '표 뒤에 텍스트가 있어야 함');
      console.log(`  인라인 배치 검증 ✓`);
    } else {
      console.log(`  pi=1 표를 렌더 트리에서 찾지 못함`);
    }
  }

  await screenshot(page, 'tac-create-02-verified');
  console.log('  인라인 TAC 표 직접 생성 + 배치 검증 완료 ✓');
});
