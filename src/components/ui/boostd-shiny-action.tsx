// Adapted from Hyperiux's Shiny Button: https://21st.dev/@hyperiux/components/shiny-button
import React from 'react';
import { Link } from 'react-router-dom';
import './boostd-shiny-action.css';

type ShinyActionProps = {
  children: React.ReactNode;
  to?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  tone?: 'primary' | 'secondary';
  size?: 'normal' | 'small';
  className?: string;
};

export function BoostDShinyAction({ children, to, onClick, tone = 'primary', size = 'normal', className = '' }: ShinyActionProps) {
  const classes = `boostd-shiny-action shiny-${tone} shiny-${size} ${className}`.trim();
  const content = <span className="boostd-shiny-content">{children}</span>;
  return to ? <Link to={to} className={classes}>{content}</Link>
    : <button type="button" onClick={onClick} className={classes}>{content}</button>;
}
