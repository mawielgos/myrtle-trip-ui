import type { ReactNode } from "react";
import {
  pageHeaderActionsStyle,
  pageHeaderStyle,
  pageHeaderTitleBlockStyle,
  pageSubtitleStyle,
  pageTitleStyle,
} from "../../styles/uiStyles";

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export default function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div style={pageHeaderStyle} className={className}>
      <div style={pageHeaderTitleBlockStyle}>
        <h1 style={pageTitleStyle}>{title}</h1>
        {subtitle ? <div style={pageSubtitleStyle}>{subtitle}</div> : null}
      </div>

      {actions ? <div style={pageHeaderActionsStyle}>{actions}</div> : null}
    </div>
  );
}
