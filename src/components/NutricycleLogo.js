import React from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

/**
 * Nutricycle brand logo — two overlapping rings (sage green + muted purple)
 * with "nutricycle" wordmark below.
 *
 * Props:
 *   width  — rendered width  (default 180)
 *   height — rendered height (default 120)
 *   showText — whether to render the "nutricycle" wordmark (default true)
 *   ringColor — override both ring colours (useful for all-white on dark bg)
 *   textColor — override wordmark colour
 */
export const NutricycleLogo = ({
  width = 180,
  height = 120,
  showText = true,
  ringColor = null,
  textColor = '#4A4060',
}) => {
  const greenColor  = ringColor || '#8A9E82';
  const purpleColor = ringColor || '#7A6B8A';

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 360 240"
    >
      {/* Left ring — sage green */}
      <Circle
        cx="148"
        cy="108"
        r="88"
        fill="none"
        stroke={greenColor}
        strokeWidth="10"
      />
      {/* Right ring — muted purple */}
      <Circle
        cx="212"
        cy="108"
        r="88"
        fill="none"
        stroke={purpleColor}
        strokeWidth="10"
      />
      {/* Wordmark */}
      {showText && (
        <SvgText
          x="180"
          y="218"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontStyle="italic"
          fontSize="42"
          fill={textColor}
          letterSpacing="1"
        >
          nutricycle
        </SvgText>
      )}
    </Svg>
  );
};
