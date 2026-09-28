export interface CommentItem {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: string;
}

export interface CommentThread {
  root: CommentItem;
  replies: CommentItem[];
}

export const AVATAR_GRADIENTS = [
  "from-blue-600 to-indigo-600 text-white",
  "from-emerald-600 to-teal-700 text-white",
  "from-violet-600 to-purple-700 text-white",
  "from-amber-500 to-orange-600 text-white",
  "from-rose-500 to-pink-600 text-white",
  "from-cyan-600 to-blue-700 text-white",
];

export function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function formatCommentTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Tách thông tin người được reply từ định dạng @[Tên]: nội dung hoặc @Tên: nội dung */
export function parseCommentContent(content: string) {
  const bracketMatch = content.match(/^@\[([^\]]+)\]:\s*([\s\S]*)$/);
  if (bracketMatch) {
    return { replyToName: bracketMatch[1].trim(), text: bracketMatch[2].trim() };
  }
  const simpleMatch = content.match(/^@([A-Za-z0-9_À-ỹ\s]+?):\s*([\s\S]*)$/);
  if (simpleMatch) {
    return { replyToName: simpleMatch[1].trim(), text: simpleMatch[2].trim() };
  }
  return { replyToName: null, text: content };
}

/** Nhóm các bình luận thành cấu trúc cây Thread cha - con chuẩn Facebook */
export function groupCommentsIntoThreads(comments: CommentItem[]): CommentThread[] {
  const threads: CommentThread[] = [];

  for (const comment of comments) {
    const { replyToName } = parseCommentContent(comment.content);

    if (replyToName) {
      // Tìm thread phù hợp: thread gần nhất có root hoặc reply khớp tên người được trả lời
      let targetThread: CommentThread | undefined;
      for (let i = threads.length - 1; i >= 0; i--) {
        const th = threads[i];
        if (
          th.root.authorName.toLowerCase() === replyToName.toLowerCase() ||
          th.replies.some(
            (r) => r.authorName.toLowerCase() === replyToName.toLowerCase()
          )
        ) {
          targetThread = th;
          break;
        }
      }

      if (targetThread) {
        targetThread.replies.push(comment);
      } else {
        // Nếu không có thread nào khớp, tạo thread mới độc lập
        threads.push({
          root: comment,
          replies: [],
        });
      }
    } else {
      threads.push({
        root: comment,
        replies: [],
      });
    }
  }

  return threads;
}

export const QUICK_PRAISES = [
  "👏 Dự án rất ấn tượng!",
  "💡 Ý tưởng sáng tạo và thiết thực",
  "✨ Giao diện rất đẹp mắt",
  "🚀 Chúc bạn thuyết trình thành công!",
];
