"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../ui/kit/Card";
import { Button } from "../ui/kit/Button";
import { Input } from "../ui/kit/Input";
import Tabs from "../ui/kit/Tabs";
import PostCard from "../ui/PostCard";
import { api, apiDelete, apiPatch, apiPost, absoluteAssetUrl } from "../lib/api";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";
import { useLanguage } from "../providers/LanguageProvider";
import FollowsModal from "../ui/FollowsModal";

const FILTER_OPTIONS = [
  { value: "none", label: "No filter" },
  { value: "grayscale(1)", label: "Grayscale" },
  { value: "sepia(1)", label: "Sepia" },
  { value: "contrast(1.15)", label: "Contrast+" },
  { value: "saturate(1.25)", label: "Saturate+" },
  { value: "brightness(1.08)", label: "Bright" },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const { refreshMe } = useAuth();
  const { push } = useToast();
  const { t } = useLanguage();
  const [tab, setTab] = useState("posts");
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [peopleModal, setPeopleModal] = useState<null | "followers" | "following">(null);
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    origin: "",
    work: "",
    studies: "",
    activities: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    visibilityOrigin: "public",
    visibilityWork: "public",
    visibilityStudies: "public",
    visibilityActivities: "public",
    avatarFocusX: 50,
    avatarFocusY: 50,
    avatarZoom: 1,
    avatarFilter: "none",
  });

  useEffect(() => {
    (async () => {
      try {
        const me: any = await api("/users/me");
        const postsRes: any = await api(`/users/${me?.data?.user?.id}/posts`);
        const likesRes: any = await api(`/users/${me?.data?.user?.id}/likes`).catch(() => ({ data: { items: [] } }));
        const u = me?.data?.user;
        setProfile(u);
        setPosts(postsRes?.data?.items || []);
        setLikedPosts(likesRes?.data?.items || []);
        setForm({
          displayName: u?.displayName || "",
          bio: u?.profile?.bio || u?.bio || "",
          origin: u?.profile?.origin || "",
          work: u?.profile?.work || "",
          studies: u?.profile?.studies || "",
          activities: (u?.profile?.activities || []).join(", "),
          email: u?.email || "",
          currentPassword: "",
          newPassword: "",
          visibilityOrigin: u?.profile?.visibility?.origin || "public",
          visibilityWork: u?.profile?.visibility?.work || "public",
          visibilityStudies: u?.profile?.visibility?.studies || "public",
          visibilityActivities: u?.profile?.visibility?.activities || "public",
          avatarFocusX: Number(u?.profile?.avatarFocusX ?? 50),
          avatarFocusY: Number(u?.profile?.avatarFocusY ?? 50),
          avatarZoom: Number(u?.profile?.avatarZoom ?? 1),
          avatarFilter: String(u?.profile?.avatarFilter || "none"),
        });
      } catch (e: any) {
        push("error", "Profile", e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [push]);

  const avatarPreview = useMemo(() => (avatarFile ? URL.createObjectURL(avatarFile) : absoluteAssetUrl(profile?.avatarUrl)), [avatarFile, profile]);
  const coverPreview = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : absoluteAssetUrl(profile?.profile?.coverUrl)), [coverFile, profile]);
  const showAvatarEditor = Boolean(avatarFile);
  const avatarStyle: React.CSSProperties = {
    objectPosition: `${form.avatarFocusX}% ${form.avatarFocusY}%`,
    transform: `scale(${form.avatarZoom})`,
    filter: form.avatarFilter,
  };

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarFile) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview, avatarFile]);

  async function reload() {
    const me: any = await api("/users/me");
    const postsRes: any = await api(`/users/${me?.data?.user?.id}/posts`);
    const likesRes: any = await api(`/users/${me?.data?.user?.id}/likes`).catch(() => ({ data: { items: [] } }));
    setProfile(me?.data?.user);
    setPosts(postsRes?.data?.items || []);
    setLikedPosts(likesRes?.data?.items || []);
    await refreshMe();
  }

  if (loading) return <div className="rm-muted">{t("loadingProfile")}</div>;

  return (
    <div className="rm-stack">
      <Card className="overflow-hidden">
        <div className="relative -m-5 mb-5 h-44 overflow-hidden rounded-t-2xl bg-[radial-gradient(circle_at_top_left,rgba(125,90,255,0.35),transparent_40%),radial-gradient(circle_at_top_right,rgba(0,196,255,0.18),transparent_35%),linear-gradient(135deg,rgba(17,23,53,0.98),rgba(5,13,25,0.94))]">{coverPreview ? <img src={coverPreview} alt="cover" className="h-full w-full object-cover opacity-80" /> : null}<div className="absolute inset-0 bg-gradient-to-t from-[rgba(2,7,20,0.96)] via-transparent to-transparent" /></div>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {avatarPreview ? (
              <div className="h-24 w-24 overflow-hidden rounded-full border border-border/70">
                <img src={avatarPreview} alt={profile?.username} className="h-24 w-24 rounded-full object-cover" style={avatarStyle} />
              </div>
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-full bg-foreground text-background text-3xl font-black">{(profile?.username || "U").slice(0, 1).toUpperCase()}</div>
            )}
            <div>
              <div className="text-2xl font-semibold">{profile?.displayName || profile?.username}</div>
              <div className="text-sm text-muted">@{profile?.username}</div>
              <div className="text-sm text-muted">{profile?.profile?.bio || profile?.bio || "No bio yet."}</div>
            </div>
          </div>
          <div className="text-sm text-muted">Profile, personal details, security, and account controls</div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3"><div className="text-xl font-black">{profile?.stats?.postsCount || posts.length}</div><div className="text-xs uppercase tracking-[0.18em] text-white/45">{t("posts")}</div></div>
        <button type="button" onClick={() => setPeopleModal("followers")} className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-left"><div className="text-xl font-black">{profile?.stats?.followersCount || 0}</div><div className="text-xs uppercase tracking-[0.18em] text-white/45">{t("followers")}</div></button>
        <button type="button" onClick={() => setPeopleModal("following")} className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3 text-left"><div className="text-xl font-black">{profile?.stats?.followingCount || 0}</div><div className="text-xs uppercase tracking-[0.18em] text-white/45">{t("following")}</div></button>
        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3"><div className="text-xl font-black">{profile?.stats?.likesReceived || 0}</div><div className="text-xs uppercase tracking-[0.18em] text-white/45">{t("likes")}</div></div>
      </div>

      <FollowsModal open={peopleModal !== null} onClose={() => setPeopleModal(null)} userId={profile?.id || ""} />

      <Card title={t("accountTools")} subtitle={t("profile")}>
        <div className="flex flex-wrap gap-3">
          <Link href="/analytics" className="rm-action-btn rm-action-btn--ghost">{t("analytics")}</Link>
          <Link href="/privacy" className="rm-action-btn rm-action-btn--ghost">{t("privacy")}</Link>
        </div>
      </Card>

      <Tabs value={tab} onChange={setTab as any} items={[{ value: "posts", label: t("posts") }, { value: "likes", label: t("likes") }, { value: "personal", label: t("profile") }, { value: "account", label: t("accountTools") }]} />

      {tab === "posts" ? (
        <div className="rm-stack">
          <Card title="My posts" subtitle="All posts created by this user.">
            <div className="rm-stack">{posts.map((item) => <PostCard key={item.id} item={item} onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))} />)}</div>
          </Card>
        </div>
      ) : null}

      {tab === "likes" ? (
        <Card title={t("likedPosts")} subtitle="Posts you reacted to recently."><div className="rm-stack">{likedPosts.map((item) => <PostCard key={item.id} item={item} />)}</div></Card>
      ) : null}

      {tab === "personal" ? (
        <Card title="Personal details" subtitle="Choose what others can see on your profile.">
          <div className="rm-form rm-mt">
            <Input label="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            <label className="rm-field"><span className="rm-field-label">Bio</span><textarea className="rm-textarea" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Where are you from" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} />
              <select className="rm-input self-end" value={form.visibilityOrigin} onChange={(e) => setForm({ ...form, visibilityOrigin: e.target.value })}><option value="public">Anyone</option><option value="friends">Friends only</option><option value="private">Only me</option></select>
              <Input label="Where do you work" value={form.work} onChange={(e) => setForm({ ...form, work: e.target.value })} />
              <select className="rm-input self-end" value={form.visibilityWork} onChange={(e) => setForm({ ...form, visibilityWork: e.target.value })}><option value="public">Anyone</option><option value="friends">Friends only</option><option value="private">Only me</option></select>
              <Input label={t("studies")} value={form.studies} onChange={(e) => setForm({ ...form, studies: e.target.value })} />
              <select className="rm-input self-end" value={form.visibilityStudies} onChange={(e) => setForm({ ...form, visibilityStudies: e.target.value })}><option value="public">Anyone</option><option value="friends">Friends only</option><option value="private">Only me</option></select>
              <Input label="Activities you like" value={form.activities} onChange={(e) => setForm({ ...form, activities: e.target.value })} hint="Separate values with commas" />
              <select className="rm-input self-end" value={form.visibilityActivities} onChange={(e) => setForm({ ...form, visibilityActivities: e.target.value })}><option value="public">Anyone</option><option value="friends">Friends only</option><option value="private">Only me</option></select>
            </div>

            <label className="rm-field">
              <span className="rm-field-label">Cover image</span>
              <input className="rm-input" type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
            </label>

            <label className="rm-field">
              <span className="rm-field-label">Profile picture</span>
              <input className="rm-input" type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
            </label>

            {showAvatarEditor && avatarPreview ? (
              <div className="rounded-2xl border border-border/70 bg-card/30 p-4">
                <div className="text-sm font-semibold">Avatar preview and adjustment</div>
                <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-40 w-40 overflow-hidden rounded-full border border-border/70 bg-black/30">
                      <img src={avatarPreview} alt="Avatar preview" className="h-40 w-40 rounded-full object-cover" style={avatarStyle} />
                    </div>
                    <div className="text-xs text-muted">The visible circular crop updates live.</div>
                  </div>
                  <div className="grid flex-1 gap-4 md:grid-cols-2">
                    <label className="rm-field"><span className="rm-field-label">Focus X</span><input className="rm-input" type="range" min="0" max="100" value={form.avatarFocusX} onChange={(e) => setForm({ ...form, avatarFocusX: Number(e.target.value) })} /></label>
                    <label className="rm-field"><span className="rm-field-label">Focus Y</span><input className="rm-input" type="range" min="0" max="100" value={form.avatarFocusY} onChange={(e) => setForm({ ...form, avatarFocusY: Number(e.target.value) })} /></label>
                    <label className="rm-field"><span className="rm-field-label">Zoom</span><input className="rm-input" type="range" min="1" max="3" step="0.05" value={form.avatarZoom} onChange={(e) => setForm({ ...form, avatarZoom: Number(e.target.value) })} /></label>
                    <label className="rm-field"><span className="rm-field-label">Filter</span><select className="rm-input" value={form.avatarFilter} onChange={(e) => setForm({ ...form, avatarFilter: e.target.value })}>{FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                  </div>
                </div>
              </div>
            ) : null}

            <Button
              loading={saving}
              onClick={async () => {
                try {
                  setSaving(true);
                  if (coverFile) {
                    await apiPost("/users/me/cover", { filename: coverFile.name, contentType: coverFile.type || "image/jpeg", dataBase64: await fileToDataUrl(coverFile) });
                  }
                  if (avatarFile) {
                    await apiPost("/users/me/avatar", { filename: avatarFile.name, contentType: avatarFile.type || "image/jpeg", dataBase64: await fileToDataUrl(avatarFile) });
                  }
                  await apiPatch("/users/me", {
                    displayName: form.displayName,
                    bio: form.bio,
                    origin: form.origin,
                    work: form.work,
                    studies: form.studies,
                    activities: form.activities.split(",").map((x) => x.trim()).filter(Boolean),
                    visibility: { origin: form.visibilityOrigin, work: form.visibilityWork, studies: form.visibilityStudies, activities: form.visibilityActivities },
                    avatarFocusX: form.avatarFocusX,
                    avatarFocusY: form.avatarFocusY,
                    avatarZoom: form.avatarZoom,
                    avatarFilter: form.avatarFilter,
                  });
                  await reload();
                  setAvatarFile(null);
                  setCoverFile(null);
                  push("success", "Profile updated", "Your public details were saved.");
                } catch (e: any) {
                  push("error", "Profile update failed", e?.message ?? String(e));
                } finally {
                  setSaving(false);
                }
              }}
            >
              Save profile
            </Button>
          </div>
        </Card>
      ) : null}

      {tab === "account" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Change email">
            <div className="rm-form rm-mt">
              <Input label="New email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Button onClick={async () => {
                try { await apiPatch("/users/me/email", { email: form.email }); await reload(); push("success", "Email updated", form.email); }
                catch (e: any) { push("error", "Email update failed", e?.message ?? String(e)); }
              }}>Change email</Button>
            </div>
          </Card>
          <Card title="Change password">
            <div className="rm-form rm-mt">
              <Input label="Current password" type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
              <Input label="New password" type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
              <Button onClick={async () => {
                try { await apiPatch("/users/me/password", { currentPassword: form.currentPassword, newPassword: form.newPassword }); setForm({ ...form, currentPassword: "", newPassword: "" }); push("success", "Password changed", "Use the new password next time."); }
                catch (e: any) { push("error", "Password change failed", e?.message ?? String(e)); }
              }}>Change password</Button>
            </div>
          </Card>
          <Card title="Temporary deactivation">
            <div className="rm-form rm-mt">
              <div className="rm-muted">Hide the account temporarily and sign out.</div>
              <Button variant="ghost" onClick={async () => {
                try { await apiPost("/users/me/deactivate-temporary", {}); push("success", "Temporarily deactivated", "You have been signed out."); router.push("/login"); }
                catch (e: any) { push("error", "Temporary deactivation failed", e?.message ?? String(e)); }
              }}>Deactivate temporarily</Button>
            </div>
          </Card>
          <Card title="Permanent account deletion">
            <div className="rm-form rm-mt">
              <Input label="Current password" type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
              <Button variant="danger" onClick={async () => {
                try { await apiDelete("/users/me", { currentPassword: form.currentPassword }); push("success", "Account deleted", "The account was permanently removed."); router.push("/register"); }
                catch (e: any) { push("error", "Delete account failed", e?.message ?? String(e)); }
              }}>Delete account permanently</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {profile?.id ? <div className="text-sm text-muted">Public profile link: <Link className="navlink" href={`/profile/${profile.id}`}>/profile/{profile.id}</Link></div> : null}
    </div>
  );
}
