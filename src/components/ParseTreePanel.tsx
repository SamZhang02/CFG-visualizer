import type { ParseTreeNode } from '../cfg';

type ParseTreePanelProps = {
  input: string;
  accepted: boolean | null;
  trees: ParseTreeNode[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  truncated: boolean;
  embedded?: boolean;
};

function ParseNodeView({ node }: { node: ParseTreeNode }): JSX.Element {
  return (
    <li>
      <span className="tree-node-label">{node.value}</span>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child, index) =>
            child.kind === 'terminal' ? (
              <li key={`t-${child.tokenIndex}-${index}`}>
                <span className="tree-terminal-label">'{child.value}'</span>
              </li>
            ) : (
              <ParseNodeView key={`n-${child.value}-${child.start}-${child.end}-${index}`} node={child} />
            ),
          )}
        </ul>
      )}
      {node.children.length === 0 && <ul><li><span className="tree-epsilon-label">ε</span></li></ul>}
    </li>
  );
}

export function ParseTreePanel({
  input,
  accepted,
  trees,
  selectedIndex,
  onSelectIndex,
  truncated,
  embedded = false,
}: ParseTreePanelProps): JSX.Element {
  const hasResult = accepted !== null;
  const safeIndex = trees.length === 0 ? 0 : Math.min(selectedIndex, trees.length - 1);
  const selectedTree = trees[safeIndex] ?? null;

  const content = (
    <>
      {!embedded && <h2>Parse Trees</h2>}
      {!hasResult && <p className="help">Run a membership test to build parse trees.</p>}
      {hasResult && accepted === false && <p className="error">No parse tree: input is rejected.</p>}
      {hasResult && accepted && trees.length === 0 && (
        <p className="help">Input is accepted but no trees were materialized. Increase the tree cap in code if needed.</p>
      )}
      {hasResult && accepted && trees.length > 0 && (
        <>
          <div className="row row-wrap parse-tree-toolbar">
            <p>
              String: <code>{input.trim().length === 0 ? 'ε' : input}</code>
            </p>
            <p>
              Parse {safeIndex + 1} / {trees.length}
            </p>
            <div className="button-group">
              <button
                type="button"
                onClick={() => onSelectIndex(Math.max(0, safeIndex - 1))}
                disabled={safeIndex === 0}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => onSelectIndex(Math.min(trees.length - 1, safeIndex + 1))}
                disabled={safeIndex >= trees.length - 1}
              >
                Next
              </button>
            </div>
          </div>

          {truncated && (
            <p className="help">Showing a capped number of trees to keep rendering responsive.</p>
          )}

          {selectedTree && (
            <div className="parse-tree-canvas" aria-label="Parse tree">
              <ul className="parse-tree-root">
                <ParseNodeView node={selectedTree} />
              </ul>
            </div>
          )}
        </>
      )}
    </>
  );

  if (embedded) {
    return <div className="panel-section parse-tree-panel">{content}</div>;
  }

  return <section className="panel parse-tree-panel">{content}</section>;
}
