import { FormEvent, useEffect, useMemo, useState } from "react";

type UserName = "鷹取" | "山川" | "向井";
type DrinkType = { id: string; name: string; createdAt: string };
type DrinkRecord = { id: string; userName: UserName; drinkTypeId: string; drinkTypeName: string; amountMl: number; drankAt: string; updatedAt: string };
type Tab = "entry" | "stats" | "records";

const DRINK_TYPES_STORAGE_KEY = "travelDrinkMemo.drinkTypes";
const DRINK_RECORDS_STORAGE_KEY = "travelDrinkMemo.records";
const USERS: UserName[] = ["鷹取", "山川", "向井"];
const AMOUNTS = Array.from({ length: 19 }, (_, index) => 100 + index * 50);
const USER_COLORS: Record<UserName, string> = { 鷹取: "#ef6a4c", 山川: "#2f8f83", 向井: "#5b75be" };
const createId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const initialDrinkTypes = (): DrinkType[] => {
  const createdAt = new Date().toISOString();
  return ["ビール", "ハイボール", "焼酎", "日本酒", "ワイン", "レモンサワー"].map((name, i) => ({ id: `default-${i + 1}`, name, createdAt }));
};
function loadStored<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
const formatDate = (iso: string) => new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default function App() {
  const [tab, setTab] = useState<Tab>("entry");
  const [drinkTypes, setDrinkTypes] = useState<DrinkType[]>(() => loadStored(DRINK_TYPES_STORAGE_KEY, initialDrinkTypes()));
  const [records, setRecords] = useState<DrinkRecord[]>(() => loadStored(DRINK_RECORDS_STORAGE_KEY, []));
  const [userName, setUserName] = useState<UserName>(USERS[0]);
  const [drinkTypeId, setDrinkTypeId] = useState(() => drinkTypes[0]?.id ?? "");
  const [amountMl, setAmountMl] = useState(500);
  const [newTypeName, setNewTypeName] = useState("");
  const [manageTypes, setManageTypes] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<DrinkRecord | null>(null);

  useEffect(() => localStorage.setItem(DRINK_TYPES_STORAGE_KEY, JSON.stringify(drinkTypes)), [drinkTypes]);
  useEffect(() => localStorage.setItem(DRINK_RECORDS_STORAGE_KEY, JSON.stringify(records)), [records]);
  useEffect(() => { if (drinkTypes.length && !drinkTypes.some((t) => t.id === drinkTypeId)) setDrinkTypeId(drinkTypes[0].id); }, [drinkTypes, drinkTypeId]);
  useEffect(() => { if (!notice) return; const id = window.setTimeout(() => setNotice(""), 2800); return () => clearTimeout(id); }, [notice]);

  const totals = useMemo(() => {
    const byUser = Object.fromEntries(USERS.map((u) => [u, 0])) as Record<UserName, number>;
    const byType = Object.fromEntries(USERS.map((u) => [u, {}])) as Record<UserName, Record<string, number>>;
    records.forEach((r) => { byUser[r.userName] += r.amountMl; byType[r.userName][r.drinkTypeName] = (byType[r.userName][r.drinkTypeName] ?? 0) + r.amountMl; });
    return { byUser, byType };
  }, [records]);
  const sorted = useMemo(() => [...records].sort((a, b) => b.drankAt.localeCompare(a.drankAt)), [records]);
  const selectedType = drinkTypes.find((t) => t.id === drinkTypeId);
  const maxTotal = Math.max(...Object.values(totals.byUser), 1);
  const grandTotal = Object.values(totals.byUser).reduce((a, b) => a + b, 0);

  const addRecord = () => {
    if (!selectedType) return;
    const now = new Date().toISOString();
    setRecords((prev) => [...prev, { id: createId(), userName, drinkTypeId: selectedType.id, drinkTypeName: selectedType.name, amountMl, drankAt: now, updatedAt: now }]);
    setNotice(`${userName} / ${selectedType.name} / ${amountMl}ml を登録しました`);
  };
  const addType = (e: FormEvent) => {
    e.preventDefault(); const name = newTypeName.trim(); if (!name) return;
    if (drinkTypes.some((t) => t.name.toLowerCase() === name.toLowerCase())) { setNotice("同じ名前のお酒がすでにあります"); return; }
    const item = { id: createId(), name, createdAt: new Date().toISOString() };
    setDrinkTypes((prev) => [...prev, item]); setDrinkTypeId(item.id); setNewTypeName(""); setNotice(`${name} を追加しました`);
  };
  const deleteType = (type: DrinkType) => {
    if (drinkTypes.length === 1) { setNotice("お酒の種類は1つ以上必要です"); return; }
    if (!confirm(`「${type.name}」を選択肢から削除しますか？\n過去の記録は残ります。`)) return;
    setDrinkTypes((prev) => prev.filter((t) => t.id !== type.id)); setNotice(`${type.name} を選択肢から削除しました`);
  };
  const deleteRecord = (record: DrinkRecord) => {
    if (!confirm(`${record.userName} / ${record.drinkTypeName} / ${record.amountMl}ml の記録を削除しますか？`)) return;
    setRecords((prev) => prev.filter((r) => r.id !== record.id)); setNotice("記録を削除しました");
  };
  const saveEdit = (e: FormEvent) => {
    e.preventDefault(); if (!editing) return; const type = drinkTypes.find((t) => t.id === editing.drinkTypeId);
    setRecords((prev) => prev.map((r) => r.id === editing.id ? { ...editing, drinkTypeName: type?.name ?? editing.drinkTypeName, updatedAt: new Date().toISOString() } : r));
    setEditing(null); setNotice("記録を修正しました");
  };

  return <div className="app-shell">
    <header className="app-header"><div><p className="eyebrow">TRIP DRINK LOG</p><h1>旅のみメモ <span>🍻</span></h1></div><div className="header-total"><span>みんなで</span><strong>{grandTotal.toLocaleString()}<small>ml</small></strong></div></header>
    <main>
      {tab === "entry" && <section className="screen">
        <Heading eyebrow="かんたん3ステップ" title="今の一杯を記録" badge={`${records.length}件`} />
        <div className="input-card">
          <fieldset><legend><i>1</i> だれが？</legend><div className="choice-grid users">{USERS.map((u) => <button type="button" className={userName === u ? "choice selected" : "choice"} style={{ "--accent": USER_COLORS[u] } as React.CSSProperties} onClick={() => setUserName(u)} key={u}>{u}</button>)}</div></fieldset>
          <fieldset><div className="legend-row"><legend><i>2</i> なにを？</legend><button type="button" className="text-button" onClick={() => setManageTypes(true)}>種類を編集</button></div><div className="choice-grid drinks">{drinkTypes.map((t) => <button type="button" className={drinkTypeId === t.id ? "choice selected" : "choice"} onClick={() => setDrinkTypeId(t.id)} key={t.id}>{t.name}</button>)}</div></fieldset>
          <fieldset><legend><i>3</i> どれくらい？</legend><div className="amount-control"><button type="button" onClick={() => setAmountMl((v) => Math.max(100, v - 50))} disabled={amountMl === 100}>−</button><label><select aria-label="量" value={amountMl} onChange={(e) => setAmountMl(Number(e.target.value))}>{AMOUNTS.map((a) => <option key={a}>{a}</option>)}</select><span>{amountMl}<small>ml</small></span></label><button type="button" onClick={() => setAmountMl((v) => Math.min(1000, v + 50))} disabled={amountMl === 1000}>＋</button></div></fieldset>
        </div>
        <button type="button" className="submit" onClick={addRecord} disabled={!selectedType}>＋ この一杯を記録する</button><p className="keep-note">選んだ内容はそのまま。続けてすぐ登録できます。</p>
      </section>}

      {tab === "stats" && <section className="screen">
        <Heading eyebrow="DRINKING STATS" title="みんなの記録" badge={`合計 ${grandTotal.toLocaleString()}ml`} />
        {!records.length ? <Empty icon="📊" title="まだ記録がありません" text="一杯登録すると、ここに比較グラフが表示されます。" /> : <>
          <article className="card comparison"><div className="card-title"><h3>合計量を比較</h3><span>単位：ml</span></div>{USERS.map((u) => <div className="bar-row" key={u}><div><strong>{u}</strong><span>{totals.byUser[u].toLocaleString()}ml</span></div><div className="bar-track"><span style={{ width: `${totals.byUser[u] / maxTotal * 100}%`, background: USER_COLORS[u] }} /></div></div>)}</article>
          <div className="breakdowns">{USERS.map((u) => { const rows = Object.entries(totals.byType[u]).sort((a,b) => b[1]-a[1]); const max = Math.max(...rows.map(([,v]) => v), 1); return <article className="card person" key={u}><div className="person-head"><b style={{ background: USER_COLORS[u] }}>{u[0]}</b><div><h3>{u}</h3><p>{rows.length}種類</p></div><strong>{totals.byUser[u].toLocaleString()}<small>ml</small></strong></div>{!rows.length ? <p className="no-data">まだ記録がありません</p> : <div className="type-bars">{rows.map(([name,value]) => <div className="type-row" key={name}><div><span>{name}</span><strong>{value.toLocaleString()}ml</strong></div><div className="mini-track"><span style={{ width: `${value/max*100}%`, background: USER_COLORS[u] }} /></div></div>)}</div>}</article>; })}</div>
        </>}
      </section>}

      {tab === "records" && <section className="screen">
        <Heading eyebrow="HISTORY" title="飲んだ記録" badge={`${records.length}件`} />
        {!sorted.length ? <Empty icon="📝" title="記録はまだ空です" text="入力タブから最初の一杯を登録しましょう。" /> : <div className="record-list">{sorted.map((r) => <article className="record-card" key={r.id}><div className="record-main"><b style={{ background: USER_COLORS[r.userName] }}>{r.userName[0]}</b><div><p><strong>{r.userName}</strong> <i>•</i> {r.drinkTypeName}</p><time>{formatDate(r.drankAt)}</time></div><strong className="record-amount">{r.amountMl}<small>ml</small></strong></div><div className="record-actions"><button type="button" onClick={() => setEditing({...r})}>修正</button><button type="button" className="danger" onClick={() => deleteRecord(r)}>削除</button></div></article>)}</div>}
      </section>}
    </main>

    <nav className="tabs" aria-label="メインメニュー"><Tab active={tab === "entry"} icon="＋" label="入力" click={() => setTab("entry")} /><Tab active={tab === "stats"} icon="▥" label="グラフ" click={() => setTab("stats")} /><Tab active={tab === "records"} icon="≡" label="リスト" click={() => setTab("records")} /></nav>
    {notice && <div className="toast" role="status">✓ {notice}</div>}

    {manageTypes && <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && setManageTypes(false)}><section className="modal" role="dialog" aria-modal="true"><ModalHead eyebrow="DRINK TYPES" title="お酒の種類" close={() => setManageTypes(false)} /><form className="add-type" onSubmit={addType}><label htmlFor="new-type">新しい種類を追加</label><div><input id="new-type" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="例：梅酒" maxLength={30}/><button disabled={!newTypeName.trim()}>追加</button></div></form><div className="type-list">{drinkTypes.map((t) => <div key={t.id}><span>{t.name}</span><button type="button" onClick={() => deleteType(t)}>削除</button></div>)}</div><p className="modal-note">選択肢から削除しても、過去の記録は残ります。</p></section></div>}
    {editing && <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}><form className="modal edit" role="dialog" aria-modal="true" onSubmit={saveEdit}><ModalHead eyebrow="EDIT RECORD" title="記録を修正" close={() => setEditing(null)} /><label>ユーザー<select value={editing.userName} onChange={(e) => setEditing({...editing, userName: e.target.value as UserName})}>{USERS.map((u) => <option key={u}>{u}</option>)}</select></label><label>お酒の種類<select value={editing.drinkTypeId} onChange={(e) => { const type = drinkTypes.find((t) => t.id === e.target.value); setEditing({...editing, drinkTypeId: e.target.value, drinkTypeName: type?.name ?? editing.drinkTypeName}); }}>{!drinkTypes.some((t) => t.id === editing.drinkTypeId) && <option value={editing.drinkTypeId}>{editing.drinkTypeName}（削除済み）</option>}{drinkTypes.map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label><label>量<select value={editing.amountMl} onChange={(e) => setEditing({...editing, amountMl: Number(e.target.value)})}>{AMOUNTS.map((a) => <option value={a} key={a}>{a}ml</option>)}</select></label><button className="submit compact">変更を保存</button></form></div>}
  </div>;
}

function Heading({ eyebrow, title, badge }: { eyebrow: string; title: string; badge: string }) { return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><span>{badge}</span></div>; }
function Tab({ active, icon, label, click }: { active: boolean; icon: string; label: string; click: () => void }) { return <button type="button" className={active ? "active" : ""} onClick={click}><span>{icon}</span>{label}</button>; }
function Empty({ icon, title, text }: { icon: string; title: string; text: string }) { return <div className="empty"><span>{icon}</span><h3>{title}</h3><p>{text}</p></div>; }
function ModalHead({ eyebrow, title, close }: { eyebrow: string; title: string; close: () => void }) { return <div className="modal-head"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button type="button" onClick={close}>×</button></div>; }
