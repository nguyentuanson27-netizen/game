import { PwaUpdate } from "./pwa/PwaUpdate.tsx";

export function App() {
  return (
    <div className="shell">
      <header className="shell__header">
        <p className="badge">Bản nguyên mẫu</p>
        <h1 className="shell__title">Nền tảng xe đạp</h1>
        <p className="shell__subtitle">Tên tạm thời, chưa phải thương hiệu chính thức.</p>
      </header>

      <main className="shell__main">
        <section className="card" aria-labelledby="shell-status-title">
          <h2 id="shell-status-title" className="card__title">
            Khung ứng dụng đã sẵn sàng
          </h2>
          <p>
            Đây mới chỉ là khung kỹ thuật của nguyên mẫu. Chưa có sự kiện, lựa chọn hay lưu tiến
            trình nào.
          </p>
        </section>
      </main>

      <footer className="shell__footer">
        <PwaUpdate />
        <p className="shell__note">Nguyên mẫu T07 · không có máy chủ, không thu thập dữ liệu.</p>
      </footer>
    </div>
  );
}
