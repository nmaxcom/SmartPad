import React, { useEffect, useMemo, useRef, useState } from "react";

type ExamplePlaygroundProps = {
  title: string;
  description?: string;
  code: string;
};

type EmbedStatus = {
  hasErrors: boolean;
  errorCount: number;
  resultCount: number;
  errorReason: string | null;
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
  const [status, setStatus] = useState<EmbedStatus | null>(null);
  const [showReason, setShowReason] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const openUrl = useMemo(() => buildOpenInAppUrl(code, title), [code, title]);
  const inlineUrl = useMemo(() => buildInlinePreviewUrl(code, title, inlineReloadKey), [code, title, inlineReloadKey]);

  useEffect(() => {
    setStatus(null);
    setShowReason(false);
  }, [inlineReloadKey, code, title]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "smartpad-embed-status") return;
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      setStatus(event.data.payload as EmbedStatus);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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
        <div className="example-playground__status" role="status">
          {!status ? (
            <span className="example-playground__status-pill is-pending">Evaluating...</span>
          ) : status.hasErrors ? (
            <>
              <span className="example-playground__status-pill is-error">Blocked by {status.errorCount} error(s)</span>
              <button
                type="button"
                className="example-playground__status-link"
                onClick={() => setShowReason((value) => !value)}
              >
                {showReason ? "Hide reason" : "Why?"}
              </button>
              {showReason && (
                <span className="example-playground__status-detail">
                  {status.errorReason || "A source expression failed, so dependent results are unavailable."}
                </span>
              )}
            </>
          ) : status.resultCount === 0 ? (
            <span className="example-playground__status-pill is-idle">
              No live result yet (expression may be incomplete)
            </span>
          ) : (
            <span className="example-playground__status-pill is-ready">Live results active</span>
          )}
        </div>
        <iframe
          ref={iframeRef}
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
