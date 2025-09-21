// src/components/analytics/ChartWrapper.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  chartId: string;
  children: React.ReactNode;
  defaultVisible?: boolean;
  className?: string;
}

export default function ChartWrapper({
  title,
  subtitle,
  icon,
  chartId,
  children,
  defaultVisible = true,
  className = ''
}: ChartWrapperProps) {
  const [isVisible, setIsVisible] = useState(defaultVisible);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Carica preferenze da localStorage
  useEffect(() => {
    const savedVisibility = localStorage.getItem(`chart-${chartId}-visible`);
    const savedCollapsed = localStorage.getItem(`chart-${chartId}-collapsed`);
    
    if (savedVisibility !== null) {
      setIsVisible(JSON.parse(savedVisibility));
    }
    if (savedCollapsed !== null) {
      setIsCollapsed(JSON.parse(savedCollapsed));
    }
  }, [chartId]);

  // Salva preferenze in localStorage
  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    localStorage.setItem(`chart-${chartId}-visible`, JSON.stringify(newVisibility));
  };

  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem(`chart-${chartId}-collapsed`, JSON.stringify(newCollapsed));
  };

  if (!isVisible) {
    return (
      <div className={`card border-2 border-dashed border-gray-300 ${className}`}>
        <div className="card-body text-center py-4">
          <div className="d-flex align-items-center justify-content-center gap-2 text-muted">
            <EyeOff size={20} />
            <span className="fw-medium">{title}</span>
            <span className="small">(nascosto)</span>
          </div>
          <button
            onClick={toggleVisibility}
            className="btn btn-outline-primary btn-sm mt-2"
          >
            <Eye size={16} className="me-1" />
            Mostra Grafico
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      {/* Header con controlli */}
      <div className="card-header bg-light border-bottom">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            {icon}
            <div>
              <h5 className="mb-0 fw-semibold text-dark">{title}</h5>
              {subtitle && <small className="text-muted">{subtitle}</small>}
            </div>
          </div>
          
          <div className="d-flex align-items-center gap-2">
            {/* Toggle Collapse */}
            <button
              onClick={toggleCollapse}
              className="btn btn-outline-secondary btn-sm"
              title={isCollapsed ? 'Espandi grafico' : 'Comprimi grafico'}
            >
              {isCollapsed ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronUp size={16} />
              )}
            </button>
            
            {/* Toggle Visibility */}
            <button
              onClick={toggleVisibility}
              className="btn btn-outline-danger btn-sm"
              title="Nascondi grafico"
            >
              <EyeOff size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Contenuto grafico */}
      {!isCollapsed && (
        <div className="card-body">
          {children}
        </div>
      )}
      
      {/* Footer quando collassato */}
      {isCollapsed && (
        <div className="card-body py-2">
          <div className="text-center text-muted">
            <small>Grafico compresso - clicca espandi per visualizzare</small>
          </div>
        </div>
      )}
    </div>
  );
}
