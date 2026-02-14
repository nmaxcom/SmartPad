import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/variables.css";
import "./styles/globals.css";
import "./App.css";

const docsPath = window.location.pathname;
const isDocsPath = docsPath === "/docs" || docsPath.startsWith("/docs/");
let didRedirectToDocs = false;
if (isDocsPath) {
  const hasFileExtension = /\.[a-z0-9]+$/i.test(docsPath);
  if (!hasFileExtension) {
    const normalizedPath = docsPath.endsWith("/") ? docsPath : `${docsPath}/`;
    const destination = `${normalizedPath}index.html${window.location.search}${window.location.hash}`;
    window.location.replace(destination);
    didRedirectToDocs = true;
  }
}

if (!didRedirectToDocs) {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
