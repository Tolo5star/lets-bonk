import { useState, useEffect, useCallback } from "react";

export interface ToastMessage {
  id: number;
  text: string;
  color: string;
}

let toastId = 0;

export function useFeedbackToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, color = "rgba(255,255,255,0.8)") => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-2), { id, text, color }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 1500);
  }, []);

  return { toasts, showToast };
}

export function FeedbackToasts({ toasts }: { toasts: ToastMessage[] }) {
  return (
    <div style={styles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: ToastMessage }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entry animation
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      style={{
        ...styles.toast,
        color: toast.color,
        opacity: visible ? 1 : 0,
        transform: visible
          ? `translateY(0) rotate(${(Math.random() - 0.5) * 6}deg)`
          : "translateY(20px)",
      }}
    >
      {toast.text}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    pointerEvents: "none",
    zIndex: 10,
  },
  toast: {
    fontFamily: "monospace",
    fontWeight: "bold",
    fontSize: "18px",
    textShadow: "0 2px 8px rgba(0,0,0,0.8)",
    transition: "all 0.25s ease-out",
    whiteSpace: "nowrap",
  },
};
