import { describeConnection } from '../describeConnection';

const OWNER = 'darek';
const PET = 'cheetos';

const petConn = {
  person1Id: OWNER,
  relationshipType: 'pet' as const,
  qualifier: null,
  status: 'active' as const,
};

describe('describeConnection', () => {
  it('labels a pet link by the connected entity type, not column order', () => {
    // Viewer is the owner: the connected side is the pet.
    expect(describeConnection(petConn, { entityType: 'pet', species: 'Cat' }, OWNER)).toBe('Pet · Cat');
    // Viewer is the pet: the connected side is a person (the owner).
    expect(describeConnection(petConn, { entityType: 'person', species: null }, PET)).toBe('Owner');
  });

  it('still works when the pet was stored as person1 (created from the pet side)', () => {
    const reversed = { ...petConn, person1Id: PET };
    expect(describeConnection(reversed, { entityType: 'pet', species: 'Dog' }, OWNER)).toBe('Pet · Dog');
    expect(describeConnection(reversed, { entityType: 'person', species: null }, PET)).toBe('Owner');
  });

  it('falls back to "Pet" when species is missing', () => {
    expect(describeConnection(petConn, { entityType: 'pet', species: null }, OWNER)).toBe('Pet');
  });

  it('labels a child link from each side (person1 = parent)', () => {
    const childConn = { ...petConn, relationshipType: 'child' as const, qualifier: 'eldest' };
    expect(describeConnection(childConn, { entityType: 'person', species: null }, OWNER)).toBe('Child • eldest');
    expect(describeConnection(childConn, { entityType: 'person', species: null }, PET)).toBe('Parent • eldest');
  });

  it('labels a parent link (reciprocal type, person1 = child)', () => {
    // Created from the child's profile: person1 = child, person2 = parent.
    const parentConn = { person1Id: 'kid', relationshipType: 'parent' as const, qualifier: null, status: 'active' as const };
    expect(describeConnection(parentConn, { entityType: 'person', species: null }, 'kid')).toBe('Parent');
    expect(describeConnection(parentConn, { entityType: 'person', species: null }, 'mum')).toBe('Child');
  });

  it('keeps qualifier and non-active status for regular links', () => {
    const conn = {
      person1Id: OWNER,
      relationshipType: 'friend' as const,
      qualifier: 'best',
      status: 'complicated' as const,
    };
    expect(describeConnection(conn, { entityType: 'person', species: null }, PET)).toBe(
      'friend • best • complicated'
    );
  });
});
