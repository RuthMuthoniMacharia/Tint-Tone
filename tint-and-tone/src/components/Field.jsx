export default function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  autoComplete,
}) {
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input
        className="inp"
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
      />
      {error && <div className="err">{error}</div>}
    </div>
  );
}
