import { useState } from "react";
import { ContentError, type ContentPack } from "./game/content/loader.ts";
import { loadProofPack } from "./game/content/proof.ts";
import { createIdbCheckpointStore } from "./game/persistence/idbStore.ts";
import type { CheckpointStore } from "./game/persistence/store.ts";
import { GameScreen } from "./game/ui/GameScreen.tsx";
import { PwaUpdate } from "./pwa/PwaUpdate.tsx";

interface AppProps {
  /** Injected in tests; the app uses IndexedDB by default. */
  store?: CheckpointStore;
  /** Injected in tests; the app loads the bundled proof content by default. */
  loadPack?: () => ContentPack;
}

type Boot = { pack: ContentPack; store: CheckpointStore } | { error: ContentError };

export function App({ store, loadPack = loadProofPack }: AppProps = {}) {
  const [boot] = useState<Boot>(() => {
    try {
      return { pack: loadPack(), store: store ?? createIdbCheckpointStore() };
    } catch (error) {
      if (error instanceof ContentError) return { error };
      throw error;
    }
  });

  return (
    <div className="shell">
      <header className="shell__header">
        <p className="badge">Bản nguyên mẫu</p>
        <h1 className="shell__title">Nền tảng xe đạp</h1>
        <p className="shell__subtitle">Tên tạm thời, chưa phải thương hiệu chính thức.</p>
      </header>

      <main className="shell__main">
        {"error" in boot ? (
          <section className="notice" role="alert">
            <p className="notice__text">
              Nội dung trò chơi không hợp lệ nên không thể bắt đầu. Bản lưu không bị thay đổi.
            </p>
          </section>
        ) : (
          <GameScreen store={boot.store} pack={boot.pack} />
        )}
      </main>

      <footer className="shell__footer">
        <PwaUpdate />
        <p className="shell__note">Nguyên mẫu · không có máy chủ, không thu thập dữ liệu.</p>
      </footer>
    </div>
  );
}
