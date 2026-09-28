import { useId } from "react";

function FormField({
  id,
  label,
  hint,
  error,
  required = false,
  className = "",
  ...inputProps
}) {
  const generatedId = useId();
  const inputId = id || `field-${generatedId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [inputProps["aria-describedby"], hintId, errorId]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className={`ui-form-field ${error ? "has-error" : ""} ${className}`.trim()}>
      <label htmlFor={inputId}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        {...inputProps}
        id={inputId}
        required={required}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
      />
      {hint && <small id={hintId}>{hint}</small>}
      {error && <small id={errorId} className="ui-form-field__error">{error}</small>}
    </div>
  );
}

export default FormField;
