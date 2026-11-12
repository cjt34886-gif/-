import { NativeComposer } from "./DeviceSystem";
import { useSkinState } from "./skinState";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScriptedWeChatComposer } from "./ScriptedWeChatComposer";
import {
  ChevronLeft,
  Plus,
  CirclePlus,
  Search,
  MessageCircle,
  Users,
  Compass,
  User,
  Camera,
  Phone,
  Video,
  Settings,
  Heart,
  Send,
  Home,
  Play,
  Bookmark,
  MoreHorizontal,
  Mic,
  Smile,
  Grid,
  CheckCheck,
  AtSign,
  Star,
  Music,
  Image as ImageIcon,
  Layers,
  ShoppingBag,
} from "lucide-react";
import { safeMedia, type Item, type UiValue } from "./schema";
export type SkinProps = {
  ui?: Record<string, UiValue>;
  onUi?: (key: string, value: UiValue) => void;
  appId?: string;
  owner?: string;
  ownerAvatar?: string;
  wechatName?: string;
  wechatId?: string;
  friendRequest?: Item;
  contacts?: Item[];
  virtualTime?: string;
  name: string;
  items: Item[];
  creator: boolean;
  onRead: (id: string) => void;
  onItem: (i: Item) => void;
  onAdd: () => void;
  onBack: () => void;
  thread: string;
  onThread: (s: string) => void;
};
function Avatar({
  name,
  round = false,
  src = "",
  neutral = false,
}: {
  name: string;
  round?: boolean;
  src?: string;
  neutral?: boolean;
}) {
  return (
    <span className={`skin-avatar ${round ? "round" : ""}`}>
      {safeMedia(src)?.startsWith("data:image/") ? (
        <img src={safeMedia(src)} alt="" />
      ) : neutral ? (
        <User size={23} aria-hidden="true" />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  );
}
function ItemMedia({ item }: { item: Item }) {
  const src = safeMedia(item.media);
  return src ? (
    item.kind === "audio" ? (
      <audio controls src={src} />
    ) : item.kind === "video" ? (
      <video controls playsInline src={src} />
    ) : (
      <img loading="lazy" alt={item.title} src={src} />
    )
  ) : (
    <div className="skin-photo">
      <span>{item.title}</span>
    </div>
  );
}
function MessageList({
  items,
  creator,
  onItem,
  onRead,
  whatsapp = false,
  follow = false,
  animatedId,
}: {
  items: Item[];
  creator: boolean;
  onItem: (i: Item) => void;
  onRead: (id: string) => void;
  whatsapp?: boolean;
  follow?: boolean;
  animatedId?: string;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const latest = items.at(-1)?.id;
  useLayoutEffect(() => {
    const list = scroll.current;
    if (!follow || !list) return;
    const bottom = () => {
      list.scrollTop = list.scrollHeight;
    };
    bottom();
    const observer = new ResizeObserver(bottom);
    observer.observe(list);
    return () => observer.disconnect();
  }, [follow, latest]);
  return (
    <div
      ref={scroll}
      className={`skin-messages ${whatsapp ? "wa-wallpaper" : ""}`}
    >
      <div className="skin-date">{items[0]?.time.slice(0, 10)}</div>
      {items.map((i) => (
        <div
          key={i.id}
          className={`skin-message ${i.outgoing ? "outgoing" : ""} ${i.id === animatedId ? "wx-message-arriving" : ""}`}
        >
          {!whatsapp && !i.outgoing && (
            <Avatar name={i.sender} src={i.avatar} neutral={follow} />
          )}
          <button
            className="skin-bubble"
            onClick={() => (creator ? onItem(i) : onRead(i.id))}
          >
            {["image", "audio", "video"].includes(i.kind) ? (
              <ItemMedia item={i} />
            ) : i.kind === "transfer" ? (
              <div className="skin-transfer">
                ¥ {i.body}
                <small>转账记录 · 虚构</small>
              </div>
            ) : (
              i.body
            )}
            <small className={whatsapp ? undefined : "wx-message-time"}>
              {i.time.slice(-5)}{" "}
              {whatsapp && i.outgoing && <CheckCheck size={11} />}
            </small>
          </button>
          {!whatsapp && i.outgoing && <Avatar name={i.sender} src={i.avatar} />}
        </div>
      ))}
    </div>
  );
}
function Compose({
  creator,
  onAdd,
  wa = false,
}: {
  creator: boolean;
  onAdd: () => void;
  wa?: boolean;
}) {
  return (
    <div className={`skin-compose ${wa ? "wa-compose" : ""}`}>
      {wa ? <Plus size={20} /> : <Mic size={20} />}
      <NativeComposer creator={creator} onAdd={onAdd} />

      <Smile size={21} />
      {wa ? <Mic size={20} /> : <Plus size={22} />}
    </div>
  );
}
export function WeChatSkin(props: SkinProps) {
  const script = props.creator
    ? []
    : props.items.filter((item) => item.meta.scriptedReply === "true");
  const storyKey = script[0]?.meta.conversationId ?? "scriptedReply";
  const [sentAt, setSentAt] = useSkinState<number>(props, storyKey, 0);
  const [now, setNow] = useState(Date.now);
  const hasFollowup = script.some(
    (item) => item.meta.scriptedFollowup === "true",
  );
  const followupStarted = hasFollowup && sentAt < -1;
  const started = Math.abs(sentAt);
  const firstArrival = started + 1000;
  const secondArrival = firstArrival + 1500;
  useEffect(() => {
    if (sentAt <= 0 && !followupStarted) return;
    const timers = [firstArrival, secondArrival]
      .filter((arrival) => arrival > Date.now())
      .map((arrival) =>
        window.setTimeout(() => setNow(Date.now()), arrival - Date.now()),
      );
    return () => timers.forEach(window.clearTimeout);
  }, [sentAt, followupStarted, firstArrival, secondArrival]);
  const elapsed = Math.max(now, started);
  const arrivals =
    Number(elapsed >= firstArrival) + Number(elapsed >= secondArrival);
  const followupCount = followupStarted ? arrivals : 0;
  const visibleCount =
    sentAt < 0 ? 5 + followupCount : sentAt === 0 ? 1 : 2 + arrivals;
  const scriptedThread = !!script.length && props.thread === script[0].title;
  const [seenFollowup, setSeenFollowup] = useSkinState<number>(
    props,
    storyKey + ":seenFollowup",
    0,
  );
  const reply =
    scriptedThread && script[visibleCount]?.outgoing
      ? script[visibleCount].body
      : undefined;
  const visible = new Set(script.slice(0, visibleCount).map((item) => item.id));
  const p = script.length
    ? {
        ...props,
        items: props.items
          .filter(
            (item) =>
              item.meta.scriptedReply !== "true" || visible.has(item.id),
          )
          .map((item) =>
            visible.has(item.id) && item.outgoing
              ? { ...item, avatar: props.ownerAvatar ?? "" }
              : item,
          ),
      }
    : props;
  const [tab, setTab] = useState("微信"),
    [query, setQuery] = useState(""),
    [moments, setMoments] = useState<"" | "feed" | "album">(""),
    [menu, setMenu] = useState(false),
    [searchOpen, setSearchOpen] = useState(false),
    [utility, setUtility] = useState("");
  const [readThreads, setReadThreads] = useSkinState<string[]>(
    p,
    "readThreads",
    [],
  );
  const viewingScript = scriptedThread && !utility;
  useEffect(() => {
    if (viewingScript && followupCount > seenFollowup)
      setSeenFollowup(followupCount);
  }, [viewingScript, followupCount, seenFollowup, setSeenFollowup]);
  const recentArrival = followupCount === 1 ? firstArrival : secondArrival;
  const animatedId =
    followupCount && elapsed - recentArrival < 300
      ? script[visibleCount - 1]?.id
      : undefined;
  const request = p.friendRequest;
  const requestName =
    request?.meta.remark || request?.meta.nickname || request?.title;
  const requestUnread = !!request && p.ui?.[request.id + ":seen"] !== true;
  const accepted = !!request && p.ui?.[request.id + ":accepted"] === true;
  const friendName = accepted ? requestName : undefined;
  const openRequests = () => {
    setUtility("新的朋友");
    if (requestUnread && request) p.onUi?.(request.id + ":seen", true);
  };
  useEffect(() => {
    if (utility === "新的朋友" && requestUnread && request)
      p.onUi?.(request.id + ":seen", true);
  }, [utility, requestUnread, request, p.onUi]);
  const conversations = [
    ...new Set(
      p.items
        .filter((i) => !["朋友圈", "我", "新的朋友"].includes(i.folder))
        .map((i) => i.title),
    ),
  ];
  const contacts = [
    ...new Set([
      ...p.items
        .filter((i) => i.meta.friendRequest !== "true")
        .map((i) => i.sender)
        .filter((s) => s !== "我" && s !== p.owner),
      ...(p.contacts ?? []).map((item) => item.title),
    ]),
  ];
  const coverItem = p.items.find((item) => item.meta.momentsCover === "true");
  const cover = safeMedia(coverItem?.media ?? "");
  const profileName = p.wechatName || p.owner || "机主";
  const posts = p.items.filter(
    (item) =>
      item !== coverItem &&
      (item.folder === "朋友圈" || item.kind === "post") &&
      (moments !== "album" ||
        item.outgoing ||
        item.sender === p.owner ||
        item.sender === profileName ||
        item.sender === "我"),
  );
  return (
    <div
      className="wechat-ui independent-skin"
      data-tab={tab}
      data-thread={!!p.thread}
      data-moments={!!moments}
      data-utility={!!utility}
    >
      <div className="app-nav wx-nav">
        <button
          aria-label={utility || p.thread || moments ? "返回" : "收藏"}
          onClick={() =>
            utility
              ? setUtility("")
              : p.thread
                ? p.onThread("")
                : moments
                  ? setMoments(
                      moments === "album" && tab === "发现" ? "feed" : "",
                    )
                  : setUtility("收藏")
          }
        >
          {utility || p.thread || moments ? (
            <ChevronLeft size={22} />
          ) : (
            <Star size={22} />
          )}
        </button>
        <strong>
          {utility ||
            p.thread ||
            (moments === "album"
              ? "我的朋友圈"
              : moments
                ? "朋友圈"
                : tab === "微信"
                  ? p.name
                  : tab)}
          {friendName && p.thread === friendName && !utility && (
            <Avatar name={friendName} src={request?.avatar} />
          )}
        </strong>
        {(moments || utility === "新的朋友") && !p.creator ? (
          <span aria-hidden="true" />
        ) : (
          <button
            aria-label={
              p.creator ? "新增内容" : p.thread ? "聊天详情" : "微信菜单"
            }
            onClick={
              p.creator
                ? p.onAdd
                : () => (p.thread ? setUtility("聊天信息") : setMenu(!menu))
            }
          >
            {p.thread ? (
              <MoreHorizontal size={22} />
            ) : moments ? (
              <Camera size={22} />
            ) : (
              <CirclePlus size={22} />
            )}
          </button>
        )}
      </div>
      {menu && (
        <div className="wx-popup-menu" role="menu">
          {["搜索", "发起群聊", "添加朋友", "扫一扫", "收付款"].map((label) => (
            <button
              role="menuitem"
              key={label}
              onClick={() => {
                setMenu(false);
                if (label === "搜索") {
                  setSearchOpen(true);
                } else setUtility(label);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {utility === "新的朋友" ? (
        <div className="skin-scroll wx-friend-requests">
          {request && requestName ? (
            <div className="wx-friend-request">
              <Avatar name={requestName} src={request.avatar} />
              <div className="wx-request-info">
                <strong>{requestName}</strong>
                <p>{request.body}</p>
                <time dateTime={request.time.replace(" ", "T")}>
                  {request.time.slice(-5)}
                </time>
              </div>
              <button
                className="wx-request-accept"
                disabled={accepted}
                onClick={() => p.onUi?.(request.id + ":accepted", true)}
              >
                {accepted ? "已添加" : "接受"}
              </button>
            </div>
          ) : (
            <p className="skin-empty">暂无好友申请</p>
          )}
        </div>
      ) : utility ? (
        <div className="skin-scroll wx-utility">
          {utility === "聊天信息" && (
            <div className="wx-members">
              {friendName && p.thread === friendName && (
                <div>
                  <Avatar name={friendName} src={request?.avatar} />
                  <small>{friendName}</small>
                </div>
              )}
              {[
                ...new Set(
                  p.items
                    .filter((i) => i.title === p.thread)
                    .map((i) => i.sender),
                ),
              ].map((name) => (
                <div key={name}>
                  <Avatar
                    name={name}
                    src={p.items.find((i) => i.sender === name)?.avatar}
                  />
                  <small>{name}</small>
                </div>
              ))}
            </div>
          )}
          {p.items
            .filter((i) => i.folder === utility)
            .map((i) => (
              <button
                key={i.id}
                className="wx-discovery"
                onClick={() => p.onItem(i)}
              >
                {i.title}
                <span>›</span>
              </button>
            ))}
          {!p.items.some((i) => i.folder === utility) &&
            utility !== "聊天信息" && <p className="skin-empty">暂无内容</p>}
        </div>
      ) : p.thread ? (
        <>
          <MessageList
            items={p.items.filter(
              (i) => i.title === p.thread && i.meta.friendRequest !== "true",
            )}
            creator={p.creator}
            onItem={p.onItem}
            onRead={p.onRead}
            follow={scriptedThread}
            animatedId={animatedId}
          />
          {scriptedThread ? (
            <ScriptedWeChatComposer
              reply={reply}
              onSend={() => {
                const timestamp = Date.now();
                setNow(timestamp);
                setSentAt(
                  sentAt === 0 ? timestamp : hasFollowup ? -timestamp : -1,
                );
              }}
            />
          ) : (
            <Compose creator={p.creator} onAdd={p.onAdd} />
          )}
        </>
      ) : moments ? (
        <div className="wx-moments">
          <div className="wx-moment-cover">
            {cover?.startsWith("data:image/") && (
              <img
                className="wx-moment-cover-image"
                src={cover}
                alt="雨雾中的灰蓝色海岸"
              />
            )}
            {moments === "feed" ? (
              <button
                className="wx-moment-owner"
                aria-label="打开我的朋友圈"
                onClick={() => setMoments("album")}
              >
                <strong>{profileName}</strong>
                <Avatar name={profileName} src={p.ownerAvatar} />
              </button>
            ) : (
              <div className="wx-moment-owner">
                <strong>{profileName}</strong>
                <Avatar name={profileName} src={p.ownerAvatar} />
              </div>
            )}
          </div>
          {posts.map((i) => (
            <button
              key={i.id}
              className="wx-moment-post"
              onClick={() => p.onItem(i)}
            >
              <Avatar name={i.sender} src={i.avatar} />
              <div>
                <strong>{i.sender}</strong>
                <p>{i.body}</p>
                {i.media && <ItemMedia item={i} />}
                <small>{i.time}</small>
              </div>
            </button>
          ))}
          {!posts.length && <p className="wx-moment-empty">暂无动态</p>}
          {p.creator && (
            <button className="phone-add" onClick={p.onAdd}>
              添加朋友圈动态
            </button>
          )}
        </div>
      ) : (
        <div className="skin-scroll">
          {tab === "微信" ? (
            <>
              {searchOpen && (
                <label className="wx-search">
                  <Search size={14} />
                  <input
                    aria-label="搜索微信内容"
                    placeholder="搜索"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              )}
              {conversations
                .filter(
                  (t) =>
                    t.includes(query) ||
                    p.items.some(
                      (i) => i.title === t && i.body.includes(query),
                    ),
                )
                .map((t) => {
                  const list = p.items.filter((i) => i.title === t),
                    last = list.at(-1)!;
                  const unread =
                    t === script[0]?.title
                      ? Math.max(0, followupCount - seenFollowup) +
                        Number(
                          !readThreads.includes(t) &&
                            seenFollowup === 0 &&
                            sentAt === 0 &&
                            !list[0].read,
                        )
                      : readThreads.includes(t)
                        ? 0
                        : list.filter((i) => !i.read).length;
                  return (
                    <button
                      className="wx-chat-row"
                      key={t}
                      onClick={() => {
                        setReadThreads((v) => (v.includes(t) ? v : [...v, t]));
                        p.onThread(t);
                        p.onRead(t);
                      }}
                    >
                      <span className="wx-chat-avatar">
                        <Avatar
                          name={t}
                          src={
                            last.meta.scriptedReply
                              ? list[0].avatar
                              : last.avatar
                          }
                          neutral={!!last.meta.scriptedReply}
                        />
                        {unread > 0 && <b className="wx-unread">{unread}</b>}
                      </span>
                      <div>
                        <strong>{t}</strong>
                        <p>{last.body}</p>
                      </div>
                      <time>{last.time.slice(-5)}</time>
                    </button>
                  );
                })}
              {friendName &&
                friendName.includes(query) &&
                !conversations.includes(friendName) && (
                  <button
                    className="wx-chat-row"
                    onClick={() => p.onThread(friendName)}
                  >
                    <span className="wx-chat-avatar">
                      <Avatar name={friendName} src={request?.avatar} />
                    </span>
                    <div>
                      <strong>{friendName}</strong>
                    </div>
                  </button>
                )}
              {!conversations.length && !friendName && (
                <p className="skin-empty">暂无聊天</p>
              )}
            </>
          ) : tab === "通讯录" ? (
            <>
              <button
                className="wx-contact wx-new-friends"
                onClick={openRequests}
              >
                <span className="wx-new-friends-icon">
                  <Users size={21} />
                </span>
                新的朋友
                {requestUnread && <b className="wx-request-badge">1</b>}
              </button>
              <div className="wx-section-label">联系人</div>
              {friendName && !contacts.includes(friendName) && (
                <button
                  className="wx-contact"
                  onClick={() => p.onThread(friendName)}
                >
                  <Avatar name={friendName} src={request?.avatar} />
                  {friendName}
                </button>
              )}
              {contacts.map((c) => (
                <button
                  key={c}
                  className="wx-contact"
                  onClick={() => {
                    const item = p.items.find((i) => i.sender === c);
                    if (item) {
                      p.onThread(item.title);
                      p.onRead(item.title);
                    }
                  }}
                >
                  <Avatar
                    name={c}
                    src={
                      p.contacts?.find((item) => item.title === c)?.avatar ||
                      p.items.find((i) => i.sender === c)?.avatar
                    }
                  />
                  {c}
                </button>
              ))}
            </>
          ) : tab === "发现" ? (
            <div className="wx-discover-groups">
              {[
                [Camera, "朋友圈", "#26a958"],
                [Play, "视频号", "#fa9d3b"],
                [Music, "听一听", "#fa5151"],
              ].map(([Icon, label, color]) => {
                const Glyph = Icon as typeof Camera;
                return (
                  <button
                    key={String(label)}
                    className="wx-discovery"
                    onClick={() =>
                      label === "朋友圈"
                        ? setMoments("feed")
                        : setUtility(String(label))
                    }
                  >
                    <Glyph size={22} style={{ color: String(color) }} />
                    {String(label)}
                    <span>›</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="wx-profile">
                <Avatar name={profileName} src={p.ownerAvatar} />
                <div>
                  <h2>{profileName}</h2>
                  <small>微信号：{p.wechatId || "未设置"}</small>
                  <button
                    className="wx-profile-status"
                    onClick={() => setUtility("状态")}
                  >
                    ＋ 状态
                  </button>
                </div>
              </div>
              <div className="wx-profile-menu">
                {[
                  [MessageCircle, "服务", "#07c160"],
                  [Layers, "收藏", "#e8a828"],
                  [ImageIcon, "朋友圈", "#3a9bd9"],
                  [Layers, "作品", "#329dd8"],
                  [ShoppingBag, "小店与卡包", "#ed7c59"],
                  [Smile, "表情", "#f7b900"],
                  [Settings, "设置", "#1696d2"],
                ].map(([Icon, label, color]) => {
                  const Glyph = Icon as typeof Settings;
                  return (
                    <button
                      key={String(label)}
                      className="wx-discovery"
                      onClick={() =>
                        label === "朋友圈"
                          ? setMoments("album")
                          : setUtility(String(label))
                      }
                    >
                      <Glyph size={22} style={{ color: String(color) }} />
                      {String(label)}
                      <span>›</span>
                    </button>
                  );
                })}
              </div>
              {p.items
                .filter((i) => i.folder === "我" && i !== coverItem)
                .map((i) => (
                  <button
                    className="wx-discovery"
                    key={i.id}
                    onClick={() => p.onItem(i)}
                  >
                    <User size={18} />
                    {i.title}
                    <span>›</span>
                  </button>
                ))}
              {p.creator && (
                <button className="phone-add" onClick={p.onAdd}>
                  编辑个人资料内容
                </button>
              )}
            </>
          )}
        </div>
      )}
      {!p.thread && !moments && !utility && (
        <nav className="wx-bottom">
          {[
            { label: "微信", icon: MessageCircle },
            { label: "通讯录", icon: Users },
            { label: "发现", icon: Compass },
            { label: "我", icon: User },
          ].map((t) => (
            <button
              className={tab === t.label ? "selected" : ""}
              key={t.label}
              onClick={() => setTab(t.label)}
            >
              <t.icon size={21} />
              <span>{t.label}</span>
              {requestUnread && t.label === "通讯录" && (
                <b className="wx-contacts-unread" aria-label="新好友申请" />
              )}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
export function WhatsAppSkin(p: SkinProps) {
  const [tab, setTab] = useState("聊天"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("全部");
  const tabs = [
    { label: "动态", icon: Compass },
    { label: "通话", icon: Phone },
    { label: "社区", icon: Users },
    { label: "聊天", icon: MessageCircle },
    { label: "设置", icon: Settings },
  ];
  const conversations = [
    ...new Set(
      p.items
        .filter((i) => !["动态", "通话", "社区", "设置"].includes(i.folder))
        .filter((i) => filter !== "未读" || !i.read)
        .map((i) => i.title),
    ),
  ];
  const name = tab === "聊天" ? p.name : tab;
  return (
    <div className="whatsapp-ui independent-skin">
      <div className="app-nav wa-nav">
        <button
          aria-label="返回"
          onClick={() => (p.thread ? p.onThread("") : p.onBack())}
        >
          <ChevronLeft size={22} />
        </button>
        <strong>{p.thread || name}</strong>
        <button
          aria-label={p.creator ? "新增内容" : "搜索内容"}
          onClick={
            p.creator
              ? p.onAdd
              : () =>
                  document
                    .querySelector<HTMLInputElement>(".wa-search input")
                    ?.focus()
          }
        >
          {p.creator ? <Plus size={21} /> : <Search size={20} />}
        </button>
      </div>
      {p.thread ? (
        <>
          <div className="wa-thread-profile">
            <button aria-label="返回聊天列表" onClick={() => p.onThread("")}>
              <ChevronLeft size={23} />
            </button>
            <Avatar
              name={p.thread}
              src={p.items.find((i) => i.title === p.thread)?.avatar}
              round
            />
            <div>
              <strong>{p.thread}</strong>
              <small>联系人</small>
            </div>
            <Video size={18} />
            <Phone size={17} />
          </div>
          <MessageList
            items={p.items.filter((i) => i.title === p.thread)}
            creator={p.creator}
            onItem={p.onItem}
            onRead={p.onRead}
            whatsapp
          />
          <Compose creator={p.creator} onAdd={p.onAdd} wa />
        </>
      ) : (
        <div className="skin-scroll">
          <h1 className="wa-large-title">{tab}</h1>
          {tab === "聊天" ? (
            <>
              <label className="wa-search">
                <Search size={16} />
                <input
                  placeholder="搜索"
                  aria-label="搜索WhatsApp"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="wa-filters">
                {["全部", "未读", "群组"].map((f) => (
                  <button
                    key={f}
                    className={filter === f ? "selected" : ""}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {conversations
                .filter((t) => t.includes(query))
                .filter(
                  (t) =>
                    filter !== "群组" ||
                    p.items.some((i) => i.title === t && i.folder === "群组"),
                )
                .map((t) => {
                  const last = p.items.filter((i) => i.title === t).at(-1)!;
                  return (
                    <button
                      className="wa-chat-row"
                      key={t}
                      onClick={() => {
                        p.onThread(t);
                        p.onRead(t);
                      }}
                    >
                      <Avatar name={t} src={last.avatar} round />
                      <div>
                        <strong>{t}</strong>
                        <p>
                          {last.outgoing && <CheckCheck size={12} />}{" "}
                          {last.body}
                        </p>
                      </div>
                      <time>{last.time.slice(-5)}</time>
                    </button>
                  );
                })}
            </>
          ) : tab === "设置" ? (
            <>
              <div className="wa-settings-profile">
                <Avatar name="我" round />
                <h2>个人资料</h2>
              </div>
              {p.items
                .filter((i) => i.folder === "设置")
                .map((i) => (
                  <button
                    key={i.id}
                    className="wa-record"
                    onClick={() => p.onItem(i)}
                  >
                    {i.title}
                    <span>›</span>
                  </button>
                ))}
            </>
          ) : (
            <>
              {tab === "动态" && (
                <div className="wa-status">
                  <Avatar name="我" round />
                  <span>我的状态</span>
                  {p.creator && (
                    <button aria-label="添加状态" onClick={p.onAdd}>
                      <Plus size={17} />
                    </button>
                  )}
                </div>
              )}
              {p.items
                .filter(
                  (i) =>
                    i.folder === tab || (tab === "通话" && i.kind === "call"),
                )
                .map((i) => (
                  <button
                    className="wa-record"
                    key={i.id}
                    onClick={() => p.onItem(i)}
                  >
                    <Avatar name={i.sender} src={i.avatar} round />
                    <div>
                      <strong>{i.title}</strong>
                      <p>{i.body}</p>
                    </div>
                    <span>
                      {tab === "通话" ? (
                        <Phone size={17} />
                      ) : (
                        <ChevronLeft size={15} />
                      )}
                    </span>
                  </button>
                ))}
              {!p.items.some((i) => i.folder === tab) && (
                <p className="skin-empty">暂无{tab}内容</p>
              )}
            </>
          )}
          {p.creator && (
            <button className="phone-add" onClick={p.onAdd}>
              添加{tab === "聊天" ? "聊天" : tab}内容
            </button>
          )}
        </div>
      )}
      {!p.thread && (
        <nav className="wa-bottom">
          {tabs.map((t) => (
            <button
              className={tab === t.label ? "selected" : ""}
              key={t.label}
              onClick={() => setTab(t.label)}
            >
              <t.icon size={20} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
export function InstagramSkin(p: SkinProps) {
  const [tab, setTab] = useState("首页"),
    [dm, setDm] = useState(false),
    [query, setQuery] = useState(""),
    [likes, setLikes] = useSkinState<string[]>(p, "likes", []),
    [saved, setSaved] = useSkinState<string[]>(p, "saved", []),
    [showSaved, setShowSaved] = useState(false);
  const posts = p.items.filter(
      (i) =>
        i.kind === "post" ||
        !["私信", "Story", "Reels", "个人主页"].includes(i.folder),
    ),
    stories = p.items.filter((i) => i.folder === "Story"),
    reels = p.items.filter((i) => i.kind === "video" || i.folder === "Reels"),
    messages = p.items.filter((i) => i.folder === "私信");
  const tabs = [
    { label: "首页", icon: Home },
    { label: "搜索", icon: Search },
    { label: "Reels", icon: Play },
    { label: "个人主页", icon: User },
  ];
  const shown = (
    showSaved ? posts.filter((i) => saved.includes(i.id)) : posts
  ).filter((i) => (i.title + i.body + i.sender).includes(query));
  return (
    <div className="instagram-ui independent-skin">
      <div className="app-nav ig-nav">
        <button
          aria-label="返回"
          onClick={() => (dm ? setDm(false) : p.onBack())}
        >
          <ChevronLeft size={22} />
        </button>
        <strong>{dm ? "私信" : p.name}</strong>
        <div>
          {p.creator && (
            <button aria-label="新增内容" onClick={p.onAdd}>
              <Plus size={21} />
            </button>
          )}
          <button aria-label="Instagram 私信" onClick={() => setDm(!dm)}>
            <Send size={20} />
          </button>
        </div>
      </div>
      <div className="skin-scroll ig-scroll">
        {dm ? (
          <>
            {messages.map((i) => (
              <button
                key={i.id}
                className="ig-dm-row"
                onClick={() => p.onItem(i)}
              >
                <Avatar name={i.sender} round />
                <div>
                  <strong>{i.sender}</strong>
                  <p>{i.body}</p>
                </div>
              </button>
            ))}
            {!messages.length && <p className="skin-empty">暂无私信</p>}
            {p.creator && (
              <button className="phone-add" onClick={p.onAdd}>
                添加私信
              </button>
            )}
          </>
        ) : tab === "首页" ? (
          <>
            <div className="ig-stories">
              <button
                className="ig-story"
                onClick={
                  p.creator
                    ? p.onAdd
                    : () => {
                        if (stories[0]) p.onItem(stories[0]);
                      }
                }
                disabled={!p.creator && !stories.length}
              >
                <span>
                  <Avatar name="我" round />
                </span>
                <small>你的快拍</small>
              </button>
              {stories.map((i) => (
                <button
                  key={i.id}
                  className="ig-story"
                  onClick={() => p.onItem(i)}
                >
                  <span>
                    <Avatar name={i.sender} round />
                  </span>
                  <small>{i.sender}</small>
                </button>
              ))}
            </div>
            {posts.map((i) => (
              <article className="ig-post" key={i.id}>
                <div className="ig-post-author">
                  <Avatar name={i.sender} round />
                  <strong>{i.sender}</strong>
                  <button
                    aria-label={`帖子详情${i.title}`}
                    onClick={() => p.onItem(i)}
                  >
                    <MoreHorizontal size={19} />
                  </button>
                </div>
                <button className="ig-post-media" onClick={() => p.onItem(i)}>
                  <ItemMedia item={i} />
                </button>
                <div className="ig-post-controls">
                  <button
                    aria-label={`喜欢${i.title}`}
                    onClick={() =>
                      setLikes(
                        likes.includes(i.id)
                          ? likes.filter((x) => x !== i.id)
                          : [...likes, i.id],
                      )
                    }
                  >
                    <Heart
                      size={23}
                      fill={likes.includes(i.id) ? "#ed4956" : "none"}
                      color={likes.includes(i.id) ? "#ed4956" : "currentColor"}
                    />
                  </button>
                  <button
                    aria-label={`评论${i.title}`}
                    onClick={() => p.onItem(i)}
                  >
                    <MessageCircle size={22} />
                  </button>
                  <button
                    aria-label={`查看${i.title}`}
                    onClick={() => p.onItem(i)}
                  >
                    <Send size={21} />
                  </button>
                  <button
                    aria-label={`收藏${i.title}`}
                    onClick={() =>
                      setSaved(
                        saved.includes(i.id)
                          ? saved.filter((x) => x !== i.id)
                          : [...saved, i.id],
                      )
                    }
                  >
                    <Bookmark
                      size={22}
                      fill={saved.includes(i.id) ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <div className="ig-post-caption">
                  <strong>
                    {i.likes + (likes.includes(i.id) ? 1 : 0)} 次赞
                  </strong>
                  <p>
                    <b>{i.sender}</b> {i.body}
                  </p>
                  <button onClick={() => p.onItem(i)}>
                    查看全部 {i.comments.length} 条评论
                  </button>
                  <time>{i.time}</time>
                </div>
              </article>
            ))}
          </>
        ) : tab === "搜索" ? (
          <>
            <label className="ig-search">
              <Search size={15} />
              <input
                value={query}
                aria-label="搜索Instagram"
                placeholder="搜索"
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="ig-explore">
              {shown.map((i) => (
                <button key={i.id} onClick={() => p.onItem(i)}>
                  <ItemMedia item={i} />
                </button>
              ))}
            </div>
          </>
        ) : tab === "Reels" ? (
          <>
            {reels.map((i) => (
              <div className="ig-reel" key={i.id}>
                <ItemMedia item={i} />
                <button onClick={() => p.onItem(i)}>
                  {i.sender} · {i.title}
                </button>
              </div>
            ))}
            {!reels.length && <p className="skin-empty">暂无 Reels</p>}
          </>
        ) : (
          <>
            <div className="ig-profile">
              <Avatar name={posts[0]?.sender ?? "我"} round />
              <div>
                <strong>{posts.length}</strong>
                <small>帖子</small>
              </div>
              <div>
                <strong>0</strong>
                <small>关注者</small>
              </div>
              <div>
                <strong>0</strong>
                <small>正在关注</small>
              </div>
            </div>
            <h3 className="ig-profile-name">{posts[0]?.sender ?? "我"}</h3>
            <div className="ig-profile-tabs">
              <button aria-label="帖子网格" onClick={() => setShowSaved(false)}>
                <Grid size={21} />
              </button>
              <button
                aria-label="已收藏帖子"
                onClick={() => setShowSaved(true)}
              >
                <Bookmark size={21} />
              </button>
              <button
                aria-label="资料内容"
                onClick={() => {
                  const i = p.items.find((i) => i.folder === "个人主页");
                  if (i) p.onItem(i);
                  else if (p.creator) p.onAdd();
                }}
              >
                <AtSign size={21} />
              </button>
            </div>
            <div className="ig-explore">
              {shown.map((i) => (
                <button key={i.id} onClick={() => p.onItem(i)}>
                  <ItemMedia item={i} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <nav className="ig-bottom">
        {tabs.map((t) => (
          <button
            key={t.label}
            className={tab === t.label ? "selected" : ""}
            aria-label={`Instagram ${t.label}`}
            onClick={() => {
              setTab(t.label);
              setDm(false);
            }}
          >
            <t.icon size={23} />
          </button>
        ))}
      </nav>
    </div>
  );
}
