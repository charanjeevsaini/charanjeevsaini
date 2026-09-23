import React from 'react';
import {Composition} from 'remotion';
import {Episode} from './Video';
import {CharacterSheet} from './CharacterSheet';
import {VIDEO} from './theme';
import {TOTAL_FRAMES} from './timeline';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Episode" component={Episode} durationInFrames={TOTAL_FRAMES} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition
      id="CharacterSheet"
      component={CharacterSheet}
      durationInFrames={120}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={{who: 'hikari' as const, mode: 'expressions' as const}}
    />
  </>
);
