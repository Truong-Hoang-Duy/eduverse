/**
 * Tiện ích tách và sắp xếp tên học viên theo bảng chữ cái tiếng Việt (A-Z).
 * Quy tắc: Sắp xếp theo Tên chính (từ cuối cùng) trước; nếu trùng tên thì xét Họ & Tên đệm.
 */

export function splitVietnameseName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  const firstName = parts[parts.length - 1];
  const lastName = parts.slice(0, -1).join(" ");
  return { firstName, lastName };
}

export function compareVietnameseNames(nameA: string, nameB: string): number {
  const a = splitVietnameseName(nameA);
  const b = splitVietnameseName(nameB);

  const cmpFirst = a.firstName.localeCompare(b.firstName, "vi", {
    sensitivity: "base",
  });
  if (cmpFirst !== 0) return cmpFirst;

  return a.lastName.localeCompare(b.lastName, "vi", {
    sensitivity: "base",
  });
}

export function sortStudentsByVietnameseName<T extends { fullName: string }>(
  students: T[]
): T[] {
  return [...students].sort((a, b) =>
    compareVietnameseNames(a.fullName, b.fullName)
  );
}
