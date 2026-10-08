describe('jest reporter', () => {
  it('AC-15: given a Jest run with one pass, one fail and one skip, when the custom reporter runs, then the JSON has three records with correct statuses', () => {
    const scenario = {
      given: 'a Jest run with one pass, one fail, one skip',
      when: 'the custom reporter writes the results',
      then: 'JSON with three records and correct statuses',
    };

    const act = (): never => {
      throw new Error(`AC-15 not implemented: ${scenario.then}`);
    };

    expect(act).not.toThrow();
  });
});
