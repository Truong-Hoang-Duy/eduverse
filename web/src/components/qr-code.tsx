import qrcode from "qrcode-generator";

/**
 * Mã QR dựng thẳng thành SVG — không gọi dịch vụ tạo QR bên ngoài (dịch vụ chết
 * là QR chết, và dự án đang 0đ/tháng; cùng lý do đã bỏ dịch vụ rút gọn link).
 *
 * Màu CỐ ĐỊNH đen trên nền trắng kể cả ở chế độ tối: máy quét cần tương phản
 * thật, QR trắng-trên-đen nhiều điện thoại đọc không ra.
 */
export function QrCode({
  value,
  size = 224,
  className,
}: {
  value: string;
  /** Cạnh của ảnh QR tính bằng px. */
  size?: number;
  className?: string;
}) {
  // typeNumber 0 = tự chọn phiên bản theo độ dài; 'M' = sửa lỗi ~15%, đủ cho màn
  // hình TV mà không làm ô vuông quá dày.
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();

  const count = qr.getModuleCount();
  const margin = 2;
  const span = count + margin * 2;

  // Gộp mọi ô đen vào MỘT path: vài trăm thẻ <rect> làm chậm hẳn khi phóng to.
  let path = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        path += `M${col + margin} ${row + margin}h1v1h-1z`;
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${span} ${span}`}
      width={size}
      height={size}
      role="img"
      aria-label="Mã QR mở trang sản phẩm"
      className={className}
      shapeRendering="crispEdges"
    >
      <rect width={span} height={span} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
