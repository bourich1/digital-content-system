import React, { type ReactNode, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import './bento-grid.css';

export function BentoGrid({children,className}:{children:ReactNode;className?:string}) {
  return <div className={cn('boostd-bento-grid',className)}>{children}</div>;
}
export function BentoCard({name,className,background,Icon,description,href,cta}:{name:string;className?:string;background:ReactNode;Icon:ComponentType<{className?:string}>;description:string;href:string;cta:string}) {
  return <article className={cn('boostd-bento-card',className)}>
    <div className="boostd-bento-background" aria-hidden="true">{background}</div>
    <div className="boostd-bento-copy"><Icon className="boostd-bento-icon"/><h3>{name}</h3><p>{description}</p></div>
    <div className="boostd-bento-action"><Link to={href}>{cta}<ArrowRight size={14}/></Link></div>
    <div className="boostd-bento-tint" aria-hidden="true"/>
  </article>;
}
