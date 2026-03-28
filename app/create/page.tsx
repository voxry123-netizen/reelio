"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../ui/kit/Card";
import { Input } from "../ui/kit/Input";
import { Button } from "../ui/kit/Button";
import Tabs from "../ui/kit/Tabs";
import { api, apiPost } from "../lib/api";
import { useToast } from "../providers/ToastProvider";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-\s_]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const DEFAULT_REALMS = [
  { slug: "home", name: "Home" },
  { slug: "videos", name: "Videos" },
  { slug: "photos", name: "Photos" },
  { slug: "gaming", name: "Gaming" },
  { slug: "music", name: "Music" },
];

export default function CreatePage() {
  const router = useRouter();
  const { push } = useToast();
  const [tab, setTab] = useState<"realm" | "post">("post");

  const [realmName, setRealmName] = useState("Gaming Realm");
  const [realmSlug, setRealmSlug] = useState("gaming-realm");
  const [realmDesc, setRealmDesc] = useState("Cyber-elegant realm");

  const [realmOptions, setRealmOptions] = useState<{ slug: string; name: string }[]>(DEFAULT_REALMS);
  const [postRealmSlug, setPostRealmSlug] = useState("home");
  const [postTitle, setPostTitle] = useState("");
  const [postCaption, setPostCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === "realm" && !realmSlug && realmName) {
      setRealmSlug(slugify(realmName));
    }
  }, [realmName, realmSlug, tab]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api("/realms");
        const serverItems = Array.isArray(res?.data?.items) ? res.data.items : [];
        const merged = new Map<string, { slug: string; name: string }>();
        for (const item of DEFAULT_REALMS) merged.set(item.slug, item);
        for (const item of serverItems) {
          if (item?.slug) merged.set(String(item.slug), { slug: String(item.slug), name: String(item.name || item.slug) });
        }
        setRealmOptions(Array.from(merged.values()));
      } catch {}
    })();
  }, []);

  const previewUrl = useMemo(() => (selectedFile ? URL.createObjectURL(selectedFile) : null), [selectedFile]);
  const isVideo = selectedFile ? selectedFile.type.startsWith("video/") : false;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="rm-stack">
      <Card title="Create" subtitle="Publish text posts, attach an image or video from your PC, or open a new realm.">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as any)}
          items={[
            { value: "post", label: "Post" },
            { value: "realm", label: "Realm" },
          ]}
        />

        {tab === "realm" && (
          <div className="rm-form rm-mt">
            <Input label="Name" value={realmName} onChange={(e) => setRealmName(e.target.value)} />
            <Input
              label="Slug"
              value={realmSlug}
              onChange={(e) => setRealmSlug(slugify(e.target.value))}
              hint="Lowercase letters, numbers and hyphens only. Example: gaming-realm"
            />
            <Input label="Description" value={realmDesc} onChange={(e) => setRealmDesc(e.target.value)} />

            <Button
              loading={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const normalizedSlug = slugify(realmSlug || realmName);
                  await apiPost("/realms", {
                    name: realmName.trim(),
                    slug: normalizedSlug,
                    description: realmDesc.trim() || undefined,
                  });
                  setRealmSlug(normalizedSlug);
                  setRealmOptions((prev) => {
                    const merged = new Map(prev.map((x) => [x.slug, x]));
                    merged.set(normalizedSlug, { slug: normalizedSlug, name: realmName.trim() || titleFromSlug(normalizedSlug) });
                    return Array.from(merged.values());
                  });
                  push({ kind: "success", title: "Realm created", message: normalizedSlug });
                } catch (e: any) {
                  push({ kind: "warning", title: "Create realm", message: e?.message });
                } finally {
                  setLoading(false);
                }
              }}
            >
              Create realm
            </Button>
          </div>
        )}

        {tab === "post" && (
          <div className="rm-form rm-mt">
            <label className="rm-field">
              <span className="rm-field-label">Post to</span>
              <select className="rm-input" value={postRealmSlug} onChange={(e) => setPostRealmSlug(e.target.value)}>
                {realmOptions.map((realm) => (
                  <option key={realm.slug} value={realm.slug}>
                    {realm.name} ({realm.slug})
                  </option>
                ))}
              </select>
              <div className="rm-field-hint">Choose where the post should appear, for example Home or Videos.</div>
            </label>

            <Input
              label="Title"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              hint="Uppercase, lowercase and special characters are allowed."
            />
            <label className="rm-field">
              <span className="rm-field-label">Caption / Description</span>
              <textarea
                className="rm-textarea"
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                rows={6}
                placeholder="Example: Special chars are allowed in title and description."
              />
            </label>
            <label className="rm-field">
              <span className="rm-field-label">Image or video from your computer</span>
              <input
                className="rm-input"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              <div className="rm-field-hint">You can choose any image or video file. The app will fit it inside the post without stretching it.</div>
            </label>
            {previewUrl ? (
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/40">
                {isVideo ? (
                  <video src={previewUrl} controls className="block max-h-[65vh] w-full bg-black object-contain" />
                ) : (
                  <img src={previewUrl} alt="preview" className="block max-h-[65vh] w-full bg-black object-contain" />
                )}
              </div>
            ) : null}

            <Button
              loading={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const normalizedRealmSlug = slugify(postRealmSlug);
                  const normalizedTitle = postTitle.trim();
                  const normalizedCaption = postCaption.trim();

                  if (!normalizedTitle) throw new Error("Title is required.");

                  if (normalizedRealmSlug) {
                    try {
                      await apiPost("/realms", {
                        slug: normalizedRealmSlug,
                        name: titleFromSlug(normalizedRealmSlug),
                        description: `${titleFromSlug(normalizedRealmSlug)} realm`,
                      });
                    } catch (e: any) {
                      if (!String(e?.message || "").toLowerCase().includes("exists")) throw e;
                    }
                  }

                  const createRes: any = await apiPost("/posts", {
                    realmSlug: normalizedRealmSlug || undefined,
                    title: normalizedTitle,
                    caption: normalizedCaption || undefined,
                    visibility: "public",
                  });
                  const postId = createRes?.data?.post?.id;
                  if (!postId) throw new Error("Post was created without an id.");

                  if (selectedFile) {
                    const dataBase64 = await fileToDataUrl(selectedFile);
                    await apiPost("/uploads/local-media", {
                      postId,
                      filename: selectedFile.name,
                      contentType: selectedFile.type || "application/octet-stream",
                      dataBase64,
                      sizeBytes: selectedFile.size,
                    });
                  }

                  push({ kind: "success", title: "Post created", message: postId });
                  router.push("/feed/home");
                  router.refresh();
                } catch (e: any) {
                  push({ kind: "error", title: "Create post failed", message: e?.message ?? String(e) });
                } finally {
                  setLoading(false);
                }
              }}
            >
              Publish post
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
