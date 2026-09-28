// Opens every collapsed section around a field so it can be focused and seen.
export function revealField(field: HTMLElement) {
  let node: HTMLElement | null = field;
  while(node) { if(node instanceof HTMLDetailsElement) node.open=true; node=node.parentElement; }
}
