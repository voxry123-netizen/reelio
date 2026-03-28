"use client";

import { useState } from "react";
import { translateText } from "../lib/api";
import { useLanguage } from "../providers/LanguageProvider";
import { useToast } from "../providers/ToastProvider";

type Props = {
  text?: string | null;
  className?: string;
  as?: "p" | "div" | "span";
};

export default function TranslatedText({ text, className = "", as = "div" }: Props) {
  const content = String(text || "").trim();
  const { language, t } = useLanguage();
  const { push } = useToast();
  const [translated, setTranslated] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!content) return null;

  const Tag = as as any;

  async function onTranslate() {
    if (translated) {
      setShowTranslated((v) => !v);
      return;
    }
    try {
      setLoading(true);
      const res: any = await translateText(content, language);
      const next = res?.data?.translatedText || content;
      setTranslated(next);
      setShowTranslated(true);
    } catch (e: any) {
      push("warning", t("translate"), e?.message || t("translationUnavailable"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Tag className={className}>{showTranslated && translated ? translated : content}</Tag>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <button type="button" className="navlink px-0 py-0" onClick={onTranslate} disabled={loading}>
          {loading ? t("translating") : showTranslated ? t("showOriginal") : t("translate")}
        </button>
        {showTranslated ? <span className="text-muted">{t("translatedFromOriginal")}</span> : null}
      </div>
    </div>
  );
}
