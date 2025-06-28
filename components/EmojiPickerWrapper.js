// components/EmojiPickerWrapper.js
"use client"; // Explicitly mark as a Client Component if using App Router features (though you're on Pages)
              // For Pages Router, this isn't strictly necessary but doesn't hurt for client-only logic.

import { Picker } from 'emoji-mart';
import data from '@emoji-mart/data';
import React from 'react'; // Ensure React is in scope if not already

const EmojiPickerWrapper = React.forwardRef(({ onSelectEmoji, ...pickerProps }, ref) => {
  return (
    <Picker
      data={data}
      onEmojiSelect={onSelectEmoji} // Note: emoji-mart v5 uses onEmojiSelect
      {...pickerProps}
      ref={ref} // Forward the ref if needed for the Picker itself
    />
  );
});

EmojiPickerWrapper.displayName = 'EmojiPickerWrapper'; // Good for DevTools

export default EmojiPickerWrapper;