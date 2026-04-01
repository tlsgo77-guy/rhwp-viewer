//! PDF 렌더러 (Task #21)
//!
//! SVG 렌더러의 출력을 svg2pdf로 변환하여 PDF를 생성한다.
//! 네이티브 전용 (WASM 미지원).

/// 폰트 데이터베이스를 초기화 (시스템 폰트 + 프로젝트 폰트 로드)
#[cfg(not(target_arch = "wasm32"))]
fn create_fontdb() -> usvg::fontdb::Database {
    let mut fontdb = usvg::fontdb::Database::new();
    // 시스템 폰트 로드
    fontdb.load_system_fonts();
    // 프로젝트 폰트 디렉토리 로드
    for dir in &["ttfs", "ttfs/windows", "ttfs/hwp"] {
        if std::path::Path::new(dir).exists() {
            fontdb.load_fonts_dir(dir);
        }
    }
    // WSL 환경: Windows 폰트 디렉토리
    if std::path::Path::new("/mnt/c/Windows/Fonts").exists() {
        fontdb.load_fonts_dir("/mnt/c/Windows/Fonts");
    }
    // 한글 폰트 fallback 설정
    fontdb.set_serif_family("바탕");
    fontdb.set_sans_serif_family("맑은 고딕");
    fontdb.set_monospace_family("D2Coding");
    fontdb
}

/// SVG에서 없는 한글 폰트명에 fallback 추가
#[cfg(not(target_arch = "wasm32"))]
fn add_font_fallbacks(svg: &str) -> String {
    // 명조 계열 → serif fallback
    let svg = svg.replace("font-family=\"휴먼명조\"", "font-family=\"휴먼명조, 바탕, serif\"");
    // 고딕 계열 → sans-serif fallback
    let svg = svg.replace("font-family=\"HCI Poppy\"", "font-family=\"HCI Poppy, 맑은 고딕, sans-serif\"");
    svg
}

/// 단일 SVG를 PDF로 변환
#[cfg(not(target_arch = "wasm32"))]
pub fn svg_to_pdf(svg_content: &str) -> Result<Vec<u8>, String> {
    let fontdb = create_fontdb();
    let mut options = usvg::Options::default();
    options.fontdb = std::sync::Arc::new(fontdb);
    let svg_with_fallback = add_font_fallbacks(svg_content);
    let tree = usvg::Tree::from_str(&svg_with_fallback, &options)
        .map_err(|e| format!("SVG 파싱 실패: {}", e))?;
    let pdf = svg2pdf::to_pdf(&tree, svg2pdf::ConversionOptions::default(), svg2pdf::PageOptions::default())
        .map_err(|e| format!("PDF 변환 실패: {:?}", e))?;
    Ok(pdf)
}

/// 여러 SVG 페이지를 개별 PDF로 변환 (다중 페이지 병합은 향후 구현)
#[cfg(not(target_arch = "wasm32"))]
pub fn svgs_to_pdfs(svg_pages: &[String]) -> Result<Vec<Vec<u8>>, String> {
    let fontdb = create_fontdb();
    let mut options = usvg::Options::default();
    options.fontdb = std::sync::Arc::new(fontdb);
    let mut pdfs = Vec::new();
    for svg in svg_pages {
        let svg_with_fallback = add_font_fallbacks(svg);
        let tree = usvg::Tree::from_str(&svg_with_fallback, &options)
            .map_err(|e| format!("SVG 파싱 실패: {}", e))?;
        let pdf = svg2pdf::to_pdf(&tree, svg2pdf::ConversionOptions::default(), svg2pdf::PageOptions::default())
            .map_err(|e| format!("PDF 변환 실패: {:?}", e))?;
        pdfs.push(pdf);
    }
    Ok(pdfs)
}
