import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border pb-16 pt-8 md:pb-8">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-bold">Sport</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tỷ số trực tiếp, lịch thi đấu, kết quả, bảng xếp hạng và tin tức thể thao.
          </p>
        </div>
        <nav aria-label="Liên kết thể thao" className="text-sm">
          <p className="font-semibold">Thể thao</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/schedule?sport=football">Bóng đá</Link></li>
            <li><Link className="hover:text-foreground" href="/schedule?sport=basketball">Bóng rổ</Link></li>
            <li><Link className="hover:text-foreground" href="/schedule?sport=tennis">Tennis</Link></li>
            <li><Link className="hover:text-foreground" href="/schedule?sport=esports">Esports</Link></li>
          </ul>
        </nav>
        <nav aria-label="Liên kết công cụ" className="text-sm">
          <p className="font-semibold">Công cụ</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/schedule">Lịch thi đấu</Link></li>
            <li><Link className="hover:text-foreground" href="/results">Kết quả</Link></li>
            <li><Link className="hover:text-foreground" href="/standings">Bảng xếp hạng</Link></li>
            <li><Link className="hover:text-foreground" href="/news">Tin tức</Link></li>
          </ul>
        </nav>
        <nav aria-label="Liên kết tài khoản" className="text-sm">
          <p className="font-semibold">Tài khoản</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li><Link className="hover:text-foreground" href="/login">Đăng nhập</Link></li>
            <li><Link className="hover:text-foreground" href="/register">Đăng ký</Link></li>
            <li><Link className="hover:text-foreground" href="/profile">Trang cá nhân</Link></li>
          </ul>
        </nav>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Sport. Dữ liệu thể thao chỉ mang tính minh họa.
      </p>
    </footer>
  );
}
