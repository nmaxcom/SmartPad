import React, { useMemo, useState } from "react";

type ExamplePlaygroundProps = {
  title: string;
  description?: string;
  code: string;
};

function buildOpenInAppUrl(code: string, title: string) {
  const params = new URLSearchParams();
  params.set("sp_example", encodeURIComponent(code));
  params.set("sp_title", encodeURIComponent(title));
  params.set("sp_import", "1");
  return `/${params.toString() ? `?${params.toString()}` : ""}`;
}

function buildInlinePreviewUrl(code: string, title: string, nonce: number) {
  const params = new URLSearchParams();
  params.set("sp_embed", "1");
  params.set("sp_theme", "spatial-neon");
  params.set("sp_preview", encodeURIComponent(code));
  params.set("sp_preview_title", encodeURIComponent(title));
  params.set("_r", String(nonce));
  return `/${params.toString() ? `?${params.toString()}` : ""}`;
}

export default function ExamplePlayground({ title, description, code }: ExamplePlaygroundProps) {
  const [copied, setCopied] = useState(false);
  const [inlineReloadKey, setInlineReloadKey] = useState(0);
  const openUrl = useMemo(() => buildOpenInAppUrl(code, title), [code, title]);
  const inlineUrl = useMemo(() => buildInlinePreviewUrl(code, title, inlineReloadKey), [code, title, inlineReloadKey]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  };

  return (
    <section className="example-playground">
      <header className="example-playground__header">
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        <div className="example-playground__actions">
          <button type="button" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" onClick={() => setInlineReloadKey((value) => value + 1)}>
            Reset
          </button>
          <a href={openUrl} target="_blank" rel="noreferrer">
            Open in SmartPad
          </a>
        </div>
      </header>
      <pre>
        <code className="language-smartpad">{code}</code>
      </pre>
      <div className="example-playground__inline">
        <div className="example-playground__inline-label">Live SmartPad Preview (interactive)</div>
        <iframe
          key={inlineUrl}
          src={inlineUrl}
          title={`${title} live preview`}
          loading="lazy"
          className="example-playground__iframe"
          scrolling="no"
        />
      </div>
    </section>
  );
}
