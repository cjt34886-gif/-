import { motion } from "motion/react";
import { useRef, type ReactNode } from "react";
import type { Item, Runtime, Work } from "../schema";

export type BannerDestination =
  | { app: "wechat"; thread: string }
  | { app: "wechat"; requests: true }
  | { app: "weibo"; post: string };

export type StoryNotice = {
  id: string;
  at: number;
  text: string;
  destination: BannerDestination;
  unread: boolean;
  storyTime?: string;
};

export function weiboPostPublished(item: Item, state: Runtime) {
  const afterMessage = item.meta.afterStoryMessage;
  if (afterMessage)
    return (
      typeof state.ui?.storyClock?.[afterMessage] === "number" &&
      `${state.date} ${state.time}` >= item.time
    );
  const key = item.meta.afterWechatReplies;
  if (!key) return true;
  const replies = state.ui?.wechat?.[key];
  return (
    Array.isArray(replies) &&
    replies.length >= Number(item.meta.requiredReplies)
  );
}

export function friendMessageArrival(
  item: Item,
  replyAt: number,
  publishedPosts: ReadonlySet<string>,
): number | undefined {
  const post = item.meta.afterWeiboPost;
  if (post && (!replyAt || !publishedPosts.has(post))) return undefined;
  return replyAt ? replyAt + Number(item.meta.delayMs) : 0;
}

export function storyNotices(work: Work, state: Runtime): StoryNotice[] {
  const items = work.data.wechat ?? [];
  const publishedPosts = new Set(
    (work.data.weibo ?? [])
      .filter((item) => weiboPostPublished(item, state))
      .map((item) => item.id),
  );
  const ui = state.ui?.wechat ?? {};
  const notices: StoryNotice[] = [];
  const message = (item: Item, thread: string, at: number, unread: boolean) => {
    notices.push({
      id: item.id,
      storyTime: item.meta.advanceStoryClock === "true" ? item.time : undefined,
      at,
      text: item.meta.bannerBody
        ? `${thread}：${item.meta.bannerBody}`
        : `${thread}给你发了一条新消息`,
      destination: { app: "wechat", thread },
      unread,
    });
  };
  const script = items.filter((item) => item.meta.scriptedReply === "true");
  const first = script[0];
  if (first) {
    const key = first.meta.conversationId;
    const sent = Number(ui[key] ?? 0);
    const reads = ui.readThreads;
    message(
      first,
      first.title,
      0,
      !sent &&
        !first.read &&
        !(Array.isArray(reads) && reads.includes(first.title)),
    );
    if (sent > 0) {
      const seen = Number(ui[key + ":seenFirstReplies"] ?? 0);
      script
        .slice(2, 4)
        .forEach((item, index) =>
          message(item, first.title, sent + 1000 + index * 1500, seen <= index),
        );
    }
    if (sent < -1) {
      const seen = Number(ui[key + ":seenFollowup"] ?? 0);
      script
        .filter((item) => item.meta.scriptedFollowup === "true")
        .forEach((item, index) =>
          message(
            item,
            first.title,
            -sent + 1000 + index * 1500,
            seen <= index,
          ),
        );
    }
  }
  for (const request of items.filter(
    (item) => item.meta.friendRequest === "true",
  )) {
    const sent = Number(ui[request.meta.afterConversation] ?? 0);
    if (sent >= -1) continue;
    const at = -sent + 2500;
    const nickname = request.meta.nickname || request.title;
    const accepted = ui[request.id + ":accepted"] === true;
    notices.push({
      id: request.id,
      at,
      text: `${nickname} 请求添加你为朋友`,
      destination: { app: "wechat", requests: true },
      unread: !accepted && ui[request.id + ":seen"] !== true,
    });
    if (!accepted) continue;
    const replies = ui[request.id + ":replies"];
    const times = Array.isArray(replies) ? replies : [];
    const seen = Number(ui[request.id + ":messagesSeen"] ?? 0);
    const thread =
      request.meta.acceptedRemark || request.meta.remark || nickname;
    let round = 0;
    let replyAt = 0;
    const dialogue = items.filter(
      (item) => item.meta.friendDialogue === request.id,
    );
    for (const [index, item] of dialogue.entries()) {
      if (item.outgoing) {
        replyAt = Number(times[round++]);
        if (!replyAt) break;
      } else {
        const arrival = friendMessageArrival(item, replyAt, publishedPosts);
        if (arrival === undefined) break;
        message(item, thread, arrival || at, seen <= index);
      }
    }
  }
  for (const item of work.data.weibo ?? []) {
    if (!item.meta.bannerBody || !publishedPosts.has(item.id)) continue;
    notices.push({
      id: item.id,
      at: 0,
      text: item.meta.bannerBody,
      destination: { app: "weibo", post: item.id },
      unread: !state.read.includes(item.id),
    });
  }
  return notices.sort((a, b) => a.at - b.at);
}

export function StoryBanner({
  icon,
  name,
  text,
  onOpen,
  onDismiss,
}: {
  icon: ReactNode;
  name: string;
  text: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const start = useRef<number | null>(null);
  const dragged = useRef(false);
  return (
    <motion.button
      className="device-banner story-banner"
      initial={{ y: "-130%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "-130%", opacity: 0 }}
      transition={{ duration: 0.28 }}
      onPointerDown={(event) => {
        event.stopPropagation();
        start.current = event.clientY;
        dragged.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerCancel={() => {
        start.current = null;
      }}
      onPointerUp={(event) => {
        event.stopPropagation();
        if (start.current !== null && start.current - event.clientY > 24) {
          dragged.current = true;
          onDismiss();
        }
        start.current = null;
      }}
      onClick={() => {
        if (!dragged.current) onOpen();
      }}
    >
      {icon}
      <span>
        <strong>{name}</strong>
        <small>现在</small>
        <span>{text}</span>
      </span>
    </motion.button>
  );
}
