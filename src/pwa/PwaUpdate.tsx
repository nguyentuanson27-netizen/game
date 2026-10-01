import { useRegisterSW } from "virtual:pwa-register/react";
import { UpdatePrompt } from "./UpdatePrompt.tsx";

export function PwaUpdate() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <UpdatePrompt
      offlineReady={offlineReady}
      needRefresh={needRefresh}
      onUpdate={() => void updateServiceWorker(true)}
      onDismiss={() => {
        setOfflineReady(false);
        setNeedRefresh(false);
      }}
    />
  );
}
