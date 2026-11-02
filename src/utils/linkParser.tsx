import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?)/g;

export function renderMessageWithLinks(text: string): React.ReactNode {
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return parts.map((part, index) => {
    if (part && part.match(URL_REGEX)) {
      let formattedUrl = part;
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }

      return (
        <a
          key={index}
          href={formattedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-500 hover:underline font-medium break-all"
        >
          {part}
        </a>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}
