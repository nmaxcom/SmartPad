import React, { useMemo, useState } from "react";

type ExamplePlaygroundProps = {
  title: string;
  description?: string;
  code: string;
};

function buildSmartPadUrl(code: string, title: string) {
  const params = new URLSearchParams();
  params.set("sp_example", encodeURIComponent(code));
  params.set("sp_title", encodeURIComponent(title));
  return `/${params.toString() ? `?${params.toString()}` : ""}`;
}

export default function ExamplePlayground({ title, description, code }: ExamplePlaygroundProps) {
  const [copied, setCopied] = useState(false);
  const openUrl = useMemo(() => buildSmartPadUrl(code, title), [code, title]);

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
          <a href={openUrl} target="_blank" rel="noreferrer">
            Open in SmartPad
          </a>
        </div>
      </header>
      <pre>
        <code className="language-smartpad">{code}</code>
      </pre>
    </section>
  );
}
