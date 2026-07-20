'use client';

// Toggles every checkbox named "ids" in the enclosing form.

export default function SelectAll({ label }: { label: string }) {
  function toggle(e: React.ChangeEvent<HTMLInputElement>) {
    const form = e.target.form;
    if (!form) return;
    form
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="ids"]')
      .forEach((box) => {
        box.checked = e.target.checked;
      });
  }

  return (
    <label className="checkline mono" style={{ fontSize: '0.78rem' }}>
      <input type="checkbox" onChange={toggle} />
      <span>{label}</span>
    </label>
  );
}
