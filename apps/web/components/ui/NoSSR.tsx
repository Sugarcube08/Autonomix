"use client";

import dynamic from 'next/dynamic';
import React from 'react';

const NoSSRComponent = ({ children }: { children: React.ReactNode }) => (
  <React.Fragment>{children}</React.Fragment>
);

const NoSSR = dynamic(() => Promise.resolve(NoSSRComponent), {
  ssr: false,
});

export default NoSSR;
