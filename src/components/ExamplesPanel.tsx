import { useState } from 'react';

type ExamplesPanelProps = {
  onGenerate: (count: number, maxLength: number) => void;
  examples: string[];
  disabled: boolean;
};

export function ExamplesPanel({ onGenerate, examples, disabled }: ExamplesPanelProps): JSX.Element {
  const [count, setCount] = useState<number>(10);
  const [maxLength, setMaxLength] = useState<number>(8);

  return (
    <section className="panel">
      <h2>Generate Examples</h2>
      <div className="row row-wrap">
        <label>
          Count
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            className="number-input"
          />
        </label>
        <label>
          Max length
          <input
            type="number"
            min={0}
            max={30}
            value={maxLength}
            onChange={(event) => setMaxLength(Number(event.target.value))}
            className="number-input"
          />
        </label>
        <button
          type="button"
          onClick={() => onGenerate(Math.max(1, count), Math.max(0, maxLength))}
          disabled={disabled}
        >
          Generate
        </button>
      </div>

      {examples.length > 0 && (
        <ul className="examples">
          {examples.map((example, index) => (
            <li key={`${example}-${index}`}>
              <code>{example}</code>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
