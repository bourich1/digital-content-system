import React from 'react';
import { BoostDShinyAction } from './boostd-shiny-action';
import { ArrowUpRight, Check } from 'lucide-react';
import './gradient-card.css';

interface GradientCardProps {
  badgeText: string;
  title: string;
  description: string;
  points: string[];
  icon: React.ReactNode;
  number: number;
  imageUrl: string;
  ctaText: string;
  ctaHref: string;
}

// Brand-colored adaptation of the supplied GradientCard reference.
export function GradientCard({ badgeText, title, description, points, icon, number, imageUrl, ctaText, ctaHref }: GradientCardProps) {
  return <article className="audience-gradient-card">
    <div className="audience-card-copy">
      <div className="audience-card-badge"><span />{badgeText}</div>
      <div className="audience-card-heading"><span className="audience-card-icon">{icon}</span><h3>{title}</h3></div>
      <p className="audience-card-description">{description}</p>
      <ul className="audience-card-points">{points.map(point => <li key={point}><Check size={13} />{point}</li>)}</ul>
      <div className="audience-shiny-cta"><BoostDShinyAction to={ctaHref} tone="secondary" size="small">{ctaText}<ArrowUpRight size={14}/></BoostDShinyAction></div>
    </div>
    <div className="audience-card-visual" aria-hidden="true">
      <span className="audience-card-orbit" />
      <img src={imageUrl} alt="" width="1000" height="667" loading="lazy" decoding="async" />
      <span className="audience-card-number">0{number}<small> / 04</small></span>
    </div>
  </article>;
}
