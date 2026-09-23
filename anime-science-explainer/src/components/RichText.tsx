// Renders text with **highlighted** key terms.
import React from 'react';
import {COLORS} from '../theme';

export const RichText: React.FC<{text: string; highlight?: string}> = ({text, highlight = COLORS.highlight}) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') ? (
          <span key={i} style={{color: highlight}}>
            {p.slice(2, -2)}
          </span>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </>
  );
};
