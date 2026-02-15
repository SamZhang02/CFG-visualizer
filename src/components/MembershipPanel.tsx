type MembershipPanelProps = {
  input: string;
  onInputChange: (value: string) => void;
  onCheck: () => void;
  result: boolean | null;
  disabled: boolean;
};

export function MembershipPanel({
  input,
  onInputChange,
  onCheck,
  result,
  disabled,
}: MembershipPanelProps): JSX.Element {
  return (
    <section className="panel">
      <h2>Membership Test</h2>
      <div className="row">
        <input
          type="text"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          className="text-input"
          placeholder="String to test"
        />
        <button type="button" onClick={onCheck} disabled={disabled}>
          Check
        </button>
      </div>
      {result !== null && (
        <p className={result ? "success" : "error"}>
          {result ? "Accepted by grammar." : "Rejected by grammar."}
        </p>
      )}
    </section>
  );
}
