// demo.tsx
import React from 'react';
import Component from '@/components/ui/stacking-card';

const projects = [
  {
    title: 'Matthias Leidinger',
    description:
      'Originally hailing from Austria, Berlin-based photographer Matthias Leindinger is a young creative brimming with talent and ideas.',
    link: 'https://cdn.21st.dev/assets/mirror/68/688e3a84bc3a2949290945455c7927eae33b1bcf702e14ff82f32620918b7f44.jpg',
    color: '#5196fd',
  },
  {
    title: 'Clément Chapillon',
    description:
      'This is a story on the border between reality and imaginary, about the contradictory feelings that the insularity of a rocky, arid, and wild territory provokes”—so French photographer Clément.',
    link: 'https://cdn.21st.dev/assets/mirror/a1/a161a794d3ce6a559a66480d2efb6381f5014557e7fd54c40d305efb07dc9b0a.jpg',
    color: '#8f89ff',
  },
  {
    title: 'Zissou',
    description:
      'Though he views photography as a medium for storytelling, Zissou’s images don’t insist on a narrative. Both crisp and ethereal.',
    link: 'https://cdn.21st.dev/assets/mirror/8a/8a8a38ac8585b1441da451da11fca95a7a396c03363d376f81887ef369baa9e7.jpg',
    color: '#13006c',
  },
  {
    title: 'Mathias Svold and Ulrik Hasemann',
    description:
      'The coastlines of Denmark are documented in tonal colors in a pensive new series by Danish photographers Ulrik Hasemann and Mathias Svold; an ongoing project investigating how humans interact with and disrupt the Danish coast.',
    link: 'https://cdn.21st.dev/assets/mirror/08/081c3280302a235d562557777a69b8dee7bb4e6da3065da587ed4d5d4b1c851b.jpg',
    color: '#ed649e',
  },
  {
    title: 'Mark Rammers',
    description:
      'Dutch photographer Mark Rammers has shared with IGNANT the first chapter of his latest photographic project, ‘all over again’—captured while in residency at Hektor, an old farm in Los Valles, Lanzarote.',
    link: 'https://cdn.21st.dev/assets/mirror/b1/b11aaf5d7ee133af4a77d7aadee376a2b81eb8152a3fc821532c08e299f67443.jpg',
    color: '#fd521a',
  },
];

function ComponentDemo() {
  return (
    <Component projects={projects} />
  );
}

export { ComponentDemo as DemoOne };
