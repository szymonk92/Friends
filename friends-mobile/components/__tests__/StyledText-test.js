const renderer = require('react-test-renderer');
const { MonoText } = require('../StyledText');

it('renders correctly', () => {
  const tree = renderer.create(<MonoText>Snapshot test!</MonoText>).toJSON();

  expect(tree).toMatchSnapshot();
});
