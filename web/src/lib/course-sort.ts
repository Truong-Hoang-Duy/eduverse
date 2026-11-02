/**
 * Sắp xếp khóa học và nhóm lớp theo đúng lộ trình học từ nhỏ đến lớn (MindX K12):
 *   1. Môn / nhánh (Domain):
 *      0: Scratch (SB, SA, SI)
 *      1: GameMaker / Game (GB, GA, GI, GMB, GMA, GMI)
 *      2: App / Python & Qt Designer (PTB, PTA, PTI, APB, APA, API)
 *      3: Web / HTML-CSS-JS (JSB, JSA, JSI, WB, WA, WI)
 *      4: Computer Science / Khoa học máy tính (CSB, CSA, CSI)
 *      5: Khác (Other)
 *   2. Cấp độ trong mỗi môn (Level):
 *      0: Basic / Cơ bản (*B)
 *      1: Advance / Nâng cao / Trung cấp (*A)
 *      2: Intensive / Chuyên sâu (*I)
 *      3: Khác
 */

export interface SortableCourseLike {
  code: string;
  name?: string | null;
}

/**
 * Xác định thứ tự môn học trong lộ trình từ nhỏ đến lớn:
 *   0 = Scratch
 *   1 = GameMaker / Game
 *   2 = App (Python / Qt Designer)
 *   3 = Web (HTML/CSS/JS)
 *   4 = Computer Science
 *   5 = Khác
 */
export function detectCourseDomainRank(
  code: string,
  name?: string | null
): number {
  const upperCode = code.trim().toUpperCase();
  const hay = `${code} ${name ?? ""}`.toLowerCase();

  // 0. Scratch: SB, SA, SI, SCR* hoặc tên chứa "scratch"
  if (
    hay.includes("scratch") ||
    /^(S[BAI]|SCR)\d*$/i.test(upperCode)
  ) {
    return 0;
  }

  // 1. GameMaker / Game: GB, GA, GI, GMB, GMA, GMI, GM* hoặc tên chứa "game"
  if (
    hay.includes("gamemaker") ||
    hay.includes("game maker") ||
    /\bgml\b/.test(hay) ||
    /\bgame\b/.test(hay) ||
    /^(G[BAI]|GM[BAI]|GM|GAME)\d*$/i.test(upperCode)
  ) {
    return 1;
  }

  // 2. App (Python & Qt Designer): PTB, PTA, PTI, APB, APA, API, APP*
  if (
    hay.includes("qtdesign") ||
    hay.includes("qt designer") ||
    hay.includes("pyqt") ||
    hay.includes("pyside") ||
    hay.includes("desktop app") ||
    hay.includes("ứng dụng") ||
    /\bapps?\b/.test(hay) ||
    /^(PT[BAI]|AP[BAI]|APP)\d*$/i.test(upperCode)
  ) {
    return 2;
  }

  // 3. Web (HTML/CSS/JS): JSB, JSA, JSI, WB, WA, WI, WEB*
  if (
    /\bweb\b/.test(hay) ||
    hay.includes("frontend") ||
    hay.includes("html") ||
    hay.includes("css") ||
    hay.includes("javascript") ||
    hay.includes("react") ||
    /^(JS[BAI]|W[BAI]|WEB)\d*$/i.test(upperCode)
  ) {
    return 3;
  }

  // 4. Computer Science: CSB, CSA, CSI, CS*
  if (
    hay.includes("computer science") ||
    hay.includes("computer scientist") ||
    hay.includes("khoa học máy tính") ||
    hay.includes("thuật toán") ||
    hay.includes("algorithm") ||
    /^(CS[BAI]|CS)\d*$/i.test(upperCode)
  ) {
    return 4;
  }

  return 5;
}

/**
 * Xác định cấp độ khóa học trong cùng một môn:
 *   0 = Basic (Cơ bản / mã kết thúc bằng B)
 *   1 = Advance (Nâng cao / Trung cấp / mã kết thúc bằng A)
 *   2 = Intensive (Chuyên sâu / mã kết thúc bằng I)
 *   3 = Khác
 */
export function detectCourseLevelRank(
  code: string,
  name?: string | null
): number {
  const upperCode = code.trim().toUpperCase();
  const lowerName = (name ?? "").toLowerCase();

  // Ưu tiên kiểm tra từ khóa cấp độ rõ ràng trong tên khóa học
  if (/\bbasic\b/.test(lowerName) || lowerName.includes("cơ bản")) {
    return 0;
  }
  if (
    /\badvanced?\b/.test(lowerName) ||
    lowerName.includes("nâng cao") ||
    lowerName.includes("trung cấp")
  ) {
    return 1;
  }
  if (/\bintensive\b/.test(lowerName) || lowerName.includes("chuyên sâu")) {
    return 2;
  }

  // Kiểm tra hậu tố chuẩn của mã khóa học (VD: SB/SA/SI, GMB/GMA/GMI, PTB/PTA/PTI, JSB/JSA/JSI, CSB/CSA/CSI)
  const suffixMatch = upperCode.match(/^[A-Z]+?([BAI])\d*$/);
  if (suffixMatch) {
    const levelChar = suffixMatch[1];
    if (levelChar === "B") return 0;
    if (levelChar === "A") return 1;
    if (levelChar === "I") return 2;
  }

  return 3;
}

/**
 * Xác định tiền tố nhóm môn từ mã khóa học để gom các mã tự đặt cùng họ lại với nhau
 * khi cả hai đều thuộc nhóm "Khác" (domainRank = 5).
 */
function extractCourseFamilyPrefix(code: string): string {
  const upperCode = code.trim().toUpperCase();
  const m = upperCode.match(/^([A-Z]+?)[BAI]\d*$/);
  if (m && m[1]) return m[1];
  return upperCode.replace(/\d+$/, "");
}

/**
 * Hàm so sánh 2 khóa học theo lộ trình:
 *   1. Thứ tự môn (Scratch -> Game -> App -> Web -> Computer Science -> Khác)
 *   2. Nếu thuộc nhóm "Khác", gom theo họ tiền tố mã khóa (family prefix)
 *   3. Thứ tự cấp độ (Basic -> Advance -> Intensive)
 *   4. Mã khóa học (localeCompare có numeric)
 */
export function compareCoursesByRoadmap(
  a: SortableCourseLike,
  b: SortableCourseLike
): number {
  const domainA = detectCourseDomainRank(a.code, a.name);
  const domainB = detectCourseDomainRank(b.code, b.name);
  if (domainA !== domainB) {
    return domainA - domainB;
  }

  // Nếu cả 2 đều thuộc nhóm môn chưa nhận diện (5), gom theo tiền tố mã khóa trước khi xét B/A/I
  if (domainA === 5) {
    const familyA = extractCourseFamilyPrefix(a.code);
    const familyB = extractCourseFamilyPrefix(b.code);
    if (familyA !== familyB) {
      return familyA.localeCompare(familyB, "vi", { numeric: true });
    }
  }

  const levelA = detectCourseLevelRank(a.code, a.name);
  const levelB = detectCourseLevelRank(b.code, b.name);
  if (levelA !== levelB) {
    return levelA - levelB;
  }

  return a.code.localeCompare(b.code, "vi", { numeric: true });
}

/** Trả về mảng mới đã sắp xếp theo lộ trình khóa học từ nhỏ đến lớn, từ Basic đến Intensive. */
export function sortCoursesByRoadmap<T extends SortableCourseLike>(
  courses: readonly T[]
): T[] {
  return [...courses].sort(compareCoursesByRoadmap);
}

