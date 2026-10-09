import React from 'react';

export function Card({children, className=''}) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function PageHeader({title, subtitle, action}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function Button({children, onClick, variant='primary', type='button', disabled=false}) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`btn ${variant}`}>
      {children}
    </button>
  );
}

export function StatCard({label, value, icon: Icon, detail}) {
  return (
    <Card className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon"><Icon size={20} /></span>
      </div>
      <strong>{value ?? '—'}</strong>
      <small>{detail}</small>
    </Card>
  );
}

export function Loading() {
  return <div className="loading">Loading library data…</div>;
}

export function ErrorMessage({message}) {
  return message ? <div className="error-box">{message}</div> : null;
}
