export default function StepIndicator({
  steps,
  current,
}: {
  steps: string[];
  current: number; // 0-indexed
}) {
  return (
    <div className="steps" role="list" aria-label="Onboarding steps">
      {steps.map((name, i) => (
        <div
          key={name}
          role="listitem"
          className={`step${i < current ? ' is-done' : ''}${i === current ? ' is-active' : ''}`}
          aria-current={i === current ? 'step' : undefined}
        >
          <div className="bar" />
          <span className="name">
            {i + 1} · {name}
          </span>
        </div>
      ))}
    </div>
  );
}
