export const sendMessage = async (
  message: string,
  onChunk: (chunk: string) => void,
  onMetadata: (confidence: number) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> => {
  try {
    const response = await fetch('http://192.168.103.215:8000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Impossible de lire le stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }
      
      chunkCount++;
      const text = decoder.decode(value, { stream: true });
      buffer += text;
      fullText += text;
      
      const metadataMatch = buffer.match(/__METADATA__(.+?)__END__/);
      if (metadataMatch) {
        let textBeforeMetadata = buffer.split('__METADATA__')[0];
        
        textBeforeMetadata = cleanEndMarkers(textBeforeMetadata);
        
        const previousLength = fullText.length - text.length;
        const previousCleanText = cleanEndMarkers(fullText.substring(0, previousLength));
        const newCharacters = textBeforeMetadata.slice(previousCleanText.length);
        
        for (const char of newCharacters) {
          onChunk(char);
        }
        
        try {
          const metadata = JSON.parse(metadataMatch[1]);
          onMetadata(metadata.confidence);
        } catch (e) {
          console.error('Erreur parsing métadonnées:', e);
        }
        
        break;
      } else {
        const cleanedFullText = cleanEndMarkers(fullText);
        const previousLength = fullText.length - text.length;
        const previousCleanText = cleanEndMarkers(fullText.substring(0, previousLength));
        
        const newCharacters = cleanedFullText.slice(previousCleanText.length);
        
        for (const char of newCharacters) {
          onChunk(char);
        }
        
        if (hasCompleteEndMarker(fullText)) {
          onComplete();
          return;
        }
      }
    }
    
    onComplete();
    
  } catch (error) {
    onError("Erreur lors de la communication avec le serveur.");
  }
};

function cleanEndMarkers(text: string): string {
  const endMarkers = [
    "end of text",
    "[end of text]",
    "<|im_end|>",
    "</s>",
    "[INST]",
    "<<SYS>>",
    "<|endoftext|>",
    "[",
    "]"
  ];
  
  let cleaned = text;
  
  endMarkers.forEach(marker => {
    cleaned = cleaned.replace(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  });
  
  cleaned = cleaned.replace(/\s*\[\s*$/, '');
  cleaned = cleaned.replace(/\s*\]\s*$/, '');
  
  cleaned = cleaned.trim();
  
  return cleaned;
}

function hasCompleteEndMarker(text: string): boolean {
  const endMarkers = [
    "end of text",
    "[end of text]",
    "<|im_end|>",
    "</s>",
    "[INST]",
    "<<SYS>>",
    "<|endoftext|>"
  ];
  
  const hasMarker = endMarkers.some(marker => text.toLowerCase().includes(marker.toLowerCase()));
  
  const hasOrphanBracket = /\s*[\[\]]\s*$/.test(text);
  
  return hasMarker || hasOrphanBracket;
}

export const checkAPIHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://192.168.103.215:8000/api/health');
    const data = await response.json();
    return data.chatbot_ready;
  } catch (error) {
    return false;
  }
};