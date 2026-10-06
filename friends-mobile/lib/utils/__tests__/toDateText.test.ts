import { parseFlexibleDate, toDateText } from '../dates';

describe('toDateText', () => {
  it('round-trips with parseFlexibleDate', () => {
    expect(toDateText(new Date(2014, 5, 5))).toBe('2014-06-05');
    expect(parseFlexibleDate(toDateText(new Date(2014, 0, 1)))).toEqual(new Date(2014, 0, 1));
  });
});
