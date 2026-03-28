"use client";

import React from "react";

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  wrapClassName?: string;
};

export function Input({
  label,
  hint,
  error,
  left,
  right,
  wrapClassName = "",
  className = "",
  id,
  ...props
}: InputProps) {
  const autoId = React.useId();
  const inputId = id ?? `rm-input-${autoId}`;

  return (
    <div className={`rm-field ${wrapClassName}`}>
      {label ? <label className="rm-field-label" htmlFor={inputId}>{label}</label> : null}

      <div className="rm-row" style={{ gap: 10 }}>
        {left ? <div>{left}</div> : null}

        <input
          id={inputId}
          className={`rm-input ${className}`}
          {...props}
        />

        {right ? <div>{right}</div> : null}
      </div>

      {error ? (
        <div className="rm-field-hint" style={{ color: "#ff5f6e" }}>{error}</div>
      ) : hint ? (
        <div className="rm-field-hint">{hint}</div>
      ) : null}
    </div>
  );
}