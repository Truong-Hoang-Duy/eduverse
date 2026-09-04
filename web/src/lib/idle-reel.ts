// Thứ tự cảnh cho "màn hình chờ" chiếu lên TV trước giờ lễ (thêm 2026-09-04).
//
// Tách khỏi component vì là logic thuần và có một luật dễ làm sai: em nào nhiều
// ảnh thì các ảnh của em đó KHÔNG được nối đuôi nhau — chiếu 4 ảnh liền của
// cùng một bạn giữa lúc phụ huynh cả lớp đang nhìn màn hình là hỏng ý đồ.

export interface IdleReelItem<T> {
  /** Khóa React — cùng một em xuất hiện nhiều lần nên id sản phẩm không đủ. */
  key: string;
  project: T;
  /** null khi em chưa đăng ảnh nào — vẫn có một cảnh chữ, không bỏ quên em nào. */
  imageUrl: string | null;
}

interface ReelSource {
  id: string;
  image_urls: string[];
}

/**
 * Dựng vòng chiếu theo LƯỢT: hết ảnh đầu của cả lớp mới sang ảnh thứ hai của
 * những em có nhiều ảnh, rồi ảnh thứ ba... Nhờ vậy mỗi vòng đều đi qua đủ mặt
 * cả lớp và không em nào bị chiếu liên tiếp.
 *
 * Em chưa có ảnh vẫn được một cảnh ở lượt đầu (`imageUrl` null).
 *
 * ⚠️ Lượt sau lượt đầu CHỈ chạy khi còn ÍT NHẤT 2 em có ảnh ở lượt đó — nghĩa là
 * ảnh thứ n của một em sẽ bị bỏ nếu cả lớp không còn ai có ảnh thứ n. Cố tình
 * đánh đổi: giữ hết ảnh thì em nhiều ảnh nhất chiếm trọn phần đuôi vòng chiếu và
 * bị chiếu liên tiếp (kể cả chỗ nối khi vòng lặp quay lại đầu), đúng thứ màn
 * hình chờ không được phép làm khi phụ huynh cả lớp đang nhìn.
 */
export function buildIdleReel<T extends ReelSource>(
  projects: T[]
): IdleReelItem<T>[] {
  const rounds = projects.reduce(
    (max, p) => Math.max(max, p.image_urls.length),
    1
  );

  const reel: IdleReelItem<T>[] = [];
  for (let round = 0; round < rounds; round++) {
    const contributors = projects.filter((p) => p.image_urls[round]);
    if (round > 0 && contributors.length < 2) break;

    for (const project of projects) {
      const imageUrl = project.image_urls[round] ?? null;
      // Lượt đầu: mọi em đều có cảnh. Lượt sau: chỉ em còn ảnh chưa chiếu.
      if (round > 0 && !imageUrl) continue;
      reel.push({ key: `${project.id}:${round}`, project, imageUrl });
    }
  }
  return reel;
}
