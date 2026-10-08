describe('playwright adapter', () => {
  it('AC-14: given a spec calling requirements({"AC-07": "..."}) and a test tagged @AC-07, when the adapter runs, then the JSON has the requirement, covers ["AC-07"], and expectedStatus failed maps to xfail', () => {
    const scenario = {
      given: 'a Playwright spec calling requirements({"AC-07": "..."}) and a test tagged @AC-07',
      when: 'the adapter converts the run',
      then: 'JSON has the requirement and covers: ["AC-07"]; expectedStatus "failed" maps to xfail',
    };

    const act = (): never => {
      throw new Error(`AC-14 not implemented: ${scenario.then}`);
    };

    expect(act).not.toThrow();
  });
});
