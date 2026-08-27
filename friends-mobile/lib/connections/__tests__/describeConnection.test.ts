import { describeConnection } from '../describeConnection';

const OWNER = 'darek';
const PET = 'cheetos';

const petConn = {
  person1Id: OWNER, // connection created from the owner's profile
  relationshipType: 'pet' as const,
  qualifier: null,
  status: 'active' as const,
};

describe('describeConnection', () => {
  it('labels a pet link by role from each side', () => {
    expect(describeConnection(petConn, { species: 'Cat' }, OWNER)).toBe('Pet · Cat');
    expect(describeConnection(petConn, { species: 'Cat' }, PET)).toBe('Owner');
  });

  it('falls back to "Pet" when species is missing', () => {
    expect(describeConnection(petConn, { species: null }, OWNER)).toBe('Pet');
  });

  it('labels a child link from each side', () => {
    const childConn = { ...petConn, relationshipType: 'child' as const, qualifier: 'eldest' };
    expect(describeConnection(childConn, null, OWNER)).toBe('Child • eldest');
    expect(describeConnection(childConn, null, PET)).toBe('Parent');
  });

  it('keeps qualifier and non-active status for regular links', () => {
    const conn = {
      person1Id: OWNER,
      relationshipType: 'friend' as const,
      qualifier: 'best',
      status: 'complicated' as const,
    };
    expect(describeConnection(conn, null, PET)).toBe('friend • best • complicated');
  });
});
