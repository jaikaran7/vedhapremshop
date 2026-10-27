'use client';

import React, { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  showClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  showClose = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-3xl',
    '4xl': 'max-w-5xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-on-surface/30 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Surface */}
      <div 
        className={`
          relative w-full ${maxWidthStyles[maxWidth]} 
          bg-surface-container-lowest rounded-3xl ambient-shadow-elevated
          overflow-visible z-10 transition-all flex flex-col max-h-[90vh]
        `}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 sm:px-8 pt-6 pb-4 bg-surface-container-low/50">
            <div>
              {title && (
                <h3 className="text-xl font-bold font-display text-on-surface tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-full transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="p-6 sm:p-8 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
