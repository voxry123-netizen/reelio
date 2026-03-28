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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const FILTER_OPTIONS = [
  { value: "none", label: "None", css: "none" },
  { value: "soft", label: "Soft", css: "saturate(1.05) contrast(1.02) brightness(1.03)" },
  { value: "vivid", label: "Vivid", css: "saturate(1.28) contrast(1.08) brightness(1.02)" },
  { value: "mono", label: "Mono", css: "grayscale(1) contrast(1.08)" },
  { value: "warm", label: "Warm", css: "sepia(0.24) saturate(1.2) hue-rotate(-8deg) brightness(1.03)" },
  { value: "cool", label: "Cool", css: "saturate(1.05) hue-rotate(10deg) contrast(1.05)" },
];

function getFilterCss(filter: string) {
  return FILTER_OPTIONS.find((x) => x.value === filter)?.css || "none";
}

export default function ProfilePage() {
  const router = useRouter();
  const { refreshMe } = useAuth();
  const { push } = useToast();
  const [tab, setTab] = useState("posts");
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
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
        const u = me?.data?.user;
        setProfile(u);
        setPosts(postsRes?.data?.items || []);
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

  const avatarPreview = useMemo(() => avatarFile ? URL.createObjectURL(avatarFile) : absoluteAssetUrl(profile?.avatarUrl), [avatarFile, profile]);
  const avatarEditorVisible = Boolean(avatarFile);
  const avatarTransform = `translate(${50 - form.avatarFocusX}%, ${50 - form.avatarFocusY}%) scale(${form.avatarZoom})`;
  const avatarFilterCss = getFilterCss(form.avatarFilter);

  async function reload() {
    const me: any = await api("/users/me");
    const postsRes: any = await api(`/users/${me?.data?.user?.id}/posts`);
    setProfile(me?.data?.user);
    setPosts(postsRes?.data?.items || []);
    await refreshMe();
  }

  function updateFocusFromPointer(clientX: number, clientY: number, rect: DOMRect) {
    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    setForm((prev) => ({ ...prev, avatarFocusX: x, avatarFocusY: y }));
  }

  if (loading) return <div className="rm-muted">Loading profile...</div>;

  return (
    <div className="rm-stack">
      <Card>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={profile?.username}
                className="h-24 w-24 rounded-full border border-border/70 object-cover"
                style={{ objectPosition: `${form.avatarFocusX}% ${form.avatarFocusY}%`, transform: `scale(${form.avatarZoom})`, filter: avatarFilterCss }}
              />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-full bg-foreground text-background text-3xl font-black">{(profile?.username || "U").slice(0,1).toUpperCase()}</div>
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

      <Tabs value={tab} onChange={setTab as any} items={[{value:"posts",label:"Posts"},{value:"personal",label:"Personal data"},{value:"account",label:"Account"}]} />

      {tab === "posts" ? (
        <div className="rm-stack">
          <Card title="My posts" subtitle="All posts created by this user.">
            <div className="rm-stack">
              {posts.map((item) => <PostCard key={item.id} item={item} onDeleted={(id)=>setPosts((prev)=>prev.filter((x)=>x.id!==id))} />)}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "personal" ? (
        <Card title="Personal details" subtitle="Choose what others can see on your profile.">
          <div className="rm-form rm-mt">
            <Input label="Display name" value={form.displayName} onChange={(e)=>setForm({...form, displayName:e.target.value})} />
            <label className="rm-field"><span className="rm-field-label">Bio</span><textarea className="rm-textarea" rows={4} value={form.bio} onChange={(e)=>setForm({...form, bio:e.target.value})} /></label>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Where are you from" value={form.origin} onChange={(e)=>setForm({...form, origin:e.target.value})} />
              <select className="rm-input self-end" value={form.visibilityOrigin} onChange={(e)=>setForm({...form, visibilityOrigin:e.target.value})}><option value="public">Anyone</option><option value="friends">Friends only</option><option value="private">Only me</option></select>
              <Input label="Where do you work" value={form.work} onChange={(e)=>setForm({...form, work:e.target.value})} />
              <select className="rm-input self-end" value={form.visibilityWork} onChange={(e)=>setForm({...form, visibilityWork:e.target.value})}><option value="public">Anyone</option><option value="friends">Friends only</option><option value="private">Only me</option></select>
              <Input label="Studies" value={form.studies} onChange={(e)=>setForm({...form, studies:e.target.value})} />
              <select className="rm-input self-end" value={form.visibilityStudies} onChange={(e)=>setForm({...form, visibilityStudies:e.target.value})}><option value="public">Anyone</option><option value="friends">Friends only</option><option value="private">Only me</option></select>
              <Input label="Activities you like" value={form.activities} onChange={(e)=>setForm({...form, activities:e.target.value})} hint="Separate values with commas" />
              <select className="rm-input self-end" value={form.visibilityActivities} onChange={(e)=>setForm({...form, visibilityActivities:e.target.value})}><option value="public">Anyone</option><option value="friends">Friends only</option><option value="private">Only me</option></select>
            </div>
            <label className="rm-field"><span className="rm-field-label">Profile picture</span><input className="rm-input" type="file" accept="image/*" onChange={(e)=>setAvatarFile(e.target.files?.[0] || null)} /></label>

            {avatarEditorVisible ? (
              <div className="rounded-3xl border border-border/70 bg-card/50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Avatar crop editor</div>
                    <div className="text-xs text-muted">Drag inside the crop box to choose the visible area.</div>
                  </div>
                  <div className="text-xs text-muted">Preview updates live</div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(320px,460px)_1fr]">
                  <div>
                    <div
                      className="relative aspect-square overflow-hidden rounded-[32px] border border-border/70 bg-black/70"
                      onMouseDown={(e) => {
                        setDragging(true);
                        updateFocusFromPointer(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
                      }}
                      onMouseMove={(e) => {
                        if (!dragging) return;
                        updateFocusFromPointer(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
                      }}
                      onMouseUp={() => setDragging(false)}
                      onMouseLeave={() => setDragging(false)}
                    >
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar crop preview"
                          className="absolute left-1/2 top-1/2 h-full w-full select-none object-cover"
                          draggable={false}
                          style={{ transform: avatarTransform, filter: avatarFilterCss }}
                        />
                      ) : null}
                      <div className="pointer-events-none absolute inset-0 rounded-[32px] border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]" />
                      <div className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-28 w-28 overflow-hidden rounded-full border border-border/70 bg-black/70">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Rounded avatar preview"
                            className="absolute left-1/2 top-1/2 h-full w-full object-cover"
                            style={{ transform: avatarTransform, filter: avatarFilterCss }}
                          />
                        ) : null}
                      </div>
                      <div className="text-sm text-muted">This is how the avatar will look in the menu and on posts.</div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="rm-field"><span className="rm-field-label">Focus X</span><input className="rm-input" type="range" min="0" max="100" value={form.avatarFocusX} onChange={(e)=>setForm({...form, avatarFocusX:Number(e.target.value)})} /></label>
                      <label className="rm-field"><span className="rm-field-label">Focus Y</span><input className="rm-input" type="range" min="0" max="100" value={form.avatarFocusY} onChange={(e)=>setForm({...form, avatarFocusY:Number(e.target.value)})} /></label>
                      <label className="rm-field"><span className="rm-field-label">Zoom</span><input className="rm-input" type="range" min="1" max="2.6" step="0.01" value={form.avatarZoom} onChange={(e)=>setForm({...form, avatarZoom:Number(e.target.value)})} /></label>
                      <label className="rm-field"><span className="rm-field-label">Filter</span><select className="rm-input" value={form.avatarFilter} onChange={(e)=>setForm({...form, avatarFilter:e.target.value})}>{FILTER_OPTIONS.map((opt)=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <Button loading={saving} onClick={async()=>{
              try {
                setSaving(true);
                if (avatarFile) {
                  await apiPost('/users/me/avatar', { filename: avatarFile.name, contentType: avatarFile.type || 'image/jpeg', dataBase64: await fileToDataUrl(avatarFile) });
                }
                await apiPatch('/users/me', {
                  displayName: form.displayName,
                  bio: form.bio,
                  origin: form.origin,
                  work: form.work,
                  studies: form.studies,
                  activities: form.activities.split(',').map((x)=>x.trim()).filter(Boolean),
                  visibility: { origin: form.visibilityOrigin, work: form.visibilityWork, studies: form.visibilityStudies, activities: form.visibilityActivities },
                  avatarFocusX: form.avatarFocusX,
                  avatarFocusY: form.avatarFocusY,
                  avatarZoom: form.avatarZoom,
                  avatarFilter: form.avatarFilter,
                });
                await reload();
                setAvatarFile(null);
                push('success','Profile updated','Your public details were saved.');
              } catch (e:any) {
                push('error','Profile update failed', e?.message ?? String(e));
              } finally { setSaving(false); }
            }}>Save profile</Button>
          </div>
        </Card>
      ) : null}

      {tab === "account" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Change email">
            <div className="rm-form rm-mt">
              <Input label="New email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} />
              <Button onClick={async()=>{
                try { await apiPatch('/users/me/email', { email: form.email }); await reload(); push('success','Email updated', form.email); }
                catch(e:any){ push('error','Email update failed', e?.message ?? String(e)); }
              }}>Change email</Button>
            </div>
          </Card>
          <Card title="Change password">
            <div className="rm-form rm-mt">
              <Input label="Current password" type="password" value={form.currentPassword} onChange={(e)=>setForm({...form, currentPassword:e.target.value})} />
              <Input label="New password" type="password" value={form.newPassword} onChange={(e)=>setForm({...form, newPassword:e.target.value})} />
              <Button onClick={async()=>{
                try { await apiPatch('/users/me/password', { currentPassword: form.currentPassword, newPassword: form.newPassword }); setForm({...form,currentPassword:'',newPassword:''}); push('success','Password changed','Use the new password next time.'); }
                catch(e:any){ push('error','Password change failed', e?.message ?? String(e)); }
              }}>Change password</Button>
            </div>
          </Card>
          <Card title="Temporary deactivation">
            <div className="rm-form rm-mt">
              <div className="rm-muted">Hide the account temporarily and sign out.</div>
              <Button variant="ghost" onClick={async()=>{
                try { await apiPost('/users/me/deactivate-temporary', {}); push('success','Temporarily deactivated','You have been signed out.'); router.push('/login'); }
                catch(e:any){ push('error','Temporary deactivation failed', e?.message ?? String(e)); }
              }}>Deactivate temporarily</Button>
            </div>
          </Card>
          <Card title="Permanent account deletion">
            <div className="rm-form rm-mt">
              <Input label="Current password" type="password" value={form.currentPassword} onChange={(e)=>setForm({...form, currentPassword:e.target.value})} />
              <Button variant="danger" onClick={async()=>{
                try { await apiDelete('/users/me', { currentPassword: form.currentPassword }); push('success','Account deleted','The account was permanently removed.'); router.push('/register'); }
                catch(e:any){ push('error','Delete account failed', e?.message ?? String(e)); }
              }}>Delete account permanently</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {profile?.id ? <div className="text-sm text-muted">Public profile link: <Link className="navlink" href={`/profile/${profile.id}`}>/profile/{profile.id}</Link></div> : null}
    </div>
  );
}
