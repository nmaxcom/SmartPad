import React, { ReactNode } from "react";
import "./AppContainer.css";

interface AppContainerProps {
  children: ReactNode;
  className?: string;
}

function AppContainer({ children, className = "" }: AppContainerProps) {
  const combinedClassName = `app-container ${className}`.trim();
  return <div className={combinedClassName}>{children}</div>;
}

export default AppContainer;
