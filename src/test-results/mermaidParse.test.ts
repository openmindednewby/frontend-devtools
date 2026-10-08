describe('mermaidParse', () => {
  it.failing('AC-10: given every generated diagram, when mermaid.parse runs at the pinned Mermaid version, then no parse error', () => {
    const scenario = {
      given: 'every generated diagram',
      when: 'mermaid.parse at the pinned Mermaid version',
      then: 'no parse error',
    };

    const act = (): never => {
      throw new Error(`AC-10 not implemented: ${scenario.then}`);
    };

    expect(act).not.toThrow();
  });
});
