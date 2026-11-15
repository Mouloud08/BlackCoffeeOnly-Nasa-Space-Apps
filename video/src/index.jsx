import { Composition, registerRoot } from 'remotion';
import plan from '../captions.json';
import { Demo } from './Demo.jsx';

function Root() {
  return (
    <Composition id="Demo" component={Demo} fps={plan.fps} width={1920} height={1080}
      durationInFrames={Math.round(plan.duration * plan.fps)} defaultProps={{}} />
  );
}

registerRoot(Root);
