import { expect } from 'chai';
import { constructActiveDAG } from './helpers';
import { DAG_TEST_DATA } from './dag-test-data';
import { StepTypeEnum } from '@novu/shared';
import { ApiException } from '../../shared/exceptions/api.exception';

const verifyResult = (actual: any[][], expected: any[][] | string, title) => {
  let i = -1,
    j = -1;
  try {
    expect(expected.length, `${title}:Comparing number of branches in DAG`).to.equal(actual.length);
    for (i = 0; i < expected.length; i++) {
      expect(expected[i].length, `${title}:Comparing each branch length in DAG`).to.equal(actual[i].length);
      for (j = 0; j < expected[i].length; j++) {
        expect(expected[i][j].delay ?? 0, `${title}:Compare delay of each step in DAG`).to.approximately(
          actual[i][j].delay,
          1500
        );
        expect(expected[i][j].active, `${title}:Compare active of each step in DAG`).to.equal(actual[i][j].active);
        expect(expected[i][j].template.type, `${title}:Compare type of each step in DAG`).to.equal(
          actual[i][j].template.type
        );
        if (expected[i][j].template.type === StepTypeEnum.DIGEST)
          expect(j, `${title}:Make sure digest nodes always at the root`).to.equal(0);
      }
    }
  } catch (error) {
    console.log(error.message);
    console.log('Expected', i !== -1 ? JSON.stringify(expected[i][j], null, 2) : JSON.stringify(expected, null, 2));
    console.log('Actual', i !== -1 ? JSON.stringify(actual[i][j], null, 2) : JSON.stringify(expected, null, 2));
    throw error;
  }
};

for (const testData of DAG_TEST_DATA) {
  const { title, steps, expected, payload, overrides } = testData;
  if (expected instanceof ApiException)
    expect(() => constructActiveDAG(steps, payload, overrides)).to.throw(ApiException);
  else {
    const dag = constructActiveDAG(steps, payload, overrides);
    verifyResult(dag, expected, title);
  }
}
