function SegmentedControl({ value, onChange, options, disabled = false, label, className = "" }) {
  return (
    <div className={`ui-segmented-control ${className}`.trim()} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`ui-segmented-control__item${value === option.value ? " is-active" : ""}`}
          onClick={() => onChange(option.value)}
          disabled={disabled}
          aria-pressed={value === option.value}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
