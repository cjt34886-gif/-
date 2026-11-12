import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Mic } from "lucide-react";
import { DeviceKeyboard } from "./DeviceSystem";

export function ScriptedWeChatComposer({
  reply,
  onSend,
}: {
  reply?: string;
  onSend: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const typing = open && !!reply;
  const canSend = typing && draft === reply;

  useEffect(() => {
    if (!typing) return;
    const characters = Array.from(reply);
    let count = 0;
    const timer = window.setInterval(() => {
      setDraft(characters.slice(0, ++count).join(""));
      if (count === characters.length) window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [typing, reply]);

  const close = () => {
    setOpen(false);
    setDraft("");
  };

  return (
    <>
      <div className="skin-compose wx-scripted-compose">
        <Mic aria-hidden="true" />
        <input
          className="native-compose-field"
          aria-label="输入消息"
          inputMode="none"
          aria-disabled={!reply}
          value={draft}
          readOnly
          onClick={() => {
            if (reply) setOpen(true);
          }}
        />
        {typing && (
          <span className="wx-scripted-caret" aria-hidden="true">
            {draft}
            <i />
          </span>
        )}
        <button
          className="wx-scripted-send"
          disabled={!canSend}
          onClick={() => {
            if (!canSend) return;
            close();
            onSend();
          }}
        >
          发送
        </button>
      </div>
      <AnimatePresence initial={false}>
        {typing && (
          <motion.div
            className="wx-scripted-keyboard"
            initial={{ height: 0, y: "100%" }}
            animate={{ height: 274, y: 0 }}
            exit={{ height: 0, y: "100%" }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <DeviceKeyboard close={close} scripted />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
