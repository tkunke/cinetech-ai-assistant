import jsPDF from 'jspdf';

interface Message {
  id: string;
  role: string;
  content: string;
}

interface Panel {
  title: string;
  description: string;
  notes: string;
  shotType: string;
}

interface Storyboard {
  title: string;
  panels: Panel[];
}

export async function generatePdfWithSelectedMessages(messages: Message[]) {
  const hasImages = (content: string) => {
    const imagePattern = /!\[.*\]\((.*)\)/;
    return imagePattern.test(content);
  };

  let breakdownMessage: Message | undefined;
  const imageMessages: Message[] = [];

  messages.forEach(message => {
    if (hasImages(message.content)) {
      imageMessages.push(message);
    } else {
      breakdownMessage = message;
    }
  });

  if (!breakdownMessage || imageMessages.length === 0) {
    console.error('Required messages not found');
    console.log('Breakdown Message Found:', !!breakdownMessage);
    console.log('Image Messages Found:', imageMessages.length);
    return;
  }

  console.log('Breakdown Message Content:', breakdownMessage.content);
  console.log('Image Messages Content:', imageMessages.map(msg => msg.content));

  const storyboard = parseStoryboard(breakdownMessage.content);

  const imagePattern = /!\[.*\]\((.*)\)/g;
  const imageUrls: string[] = [];

  imageMessages.forEach(imageMessage => {
    let match;
    while ((match = imagePattern.exec(imageMessage.content)) !== null) {
      imageUrls.push(match[1]);
    }
  });

  console.log('Extracted Image URLs:', imageUrls);

  if (imageUrls.length === 0) {
    console.error('No images found for the storyboard');
    return;
  }

  console.log('Storyboard:', storyboard);
  console.log('Image URLs:', imageUrls);

  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 10;
  const imageWidth = (pageWidth - 3 * margin) / 2;
  const imageHeight = imageWidth / 1.5;
  const textWidth = pageWidth / 2 - 2 * margin;
  const textFontSize = 10;

  pdf.setFontSize(textFontSize);

  let y = margin;

  for (let i = 0; i < storyboard.panels.length; i++) {
    const panel = storyboard.panels[i];

    const text = `Title: ${panel.title}\nDescription: ${panel.description}\nNotes: ${panel.notes}\nShot Type: ${panel.shotType}`;
    const textLines: string[] = pdf.splitTextToSize(text, textWidth);
    const textHeight = textLines.length * (pdf.getTextDimensions(textLines[0]).h + 2);
    const totalRowHeight = Math.max(textHeight, imageHeight) + 2 * margin;

    if (y + totalRowHeight > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      y = margin;
    }

    pdf.rect(margin, y, pageWidth - 2 * margin, totalRowHeight);

    const textX = margin + 2;
    const textY = y + margin;
    textLines.forEach((line: string, lineIndex: number) => {
      console.log('Adding text:', line);
      pdf.text(line, textX, textY + lineIndex * (pdf.getTextDimensions(line).h + 2));
    });

    if (imageUrls[i]) {
      try {
        const imageData = await fetchImageAsDataUrl(imageUrls[i]);
        console.log('Adding image:', imageUrls[i]);

        const imageX = pageWidth / 2 + margin / 2 + 2;
        const imageY = y + margin;
        pdf.addImage(imageData, "PNG", imageX, imageY, imageWidth - 4, imageHeight - 4);
      } catch (error: any) {
        console.error(`Error loading image: ${error.message}`);
      }
    }

    y += totalRowHeight + margin;
  }

  pdf.save(`Shot Sheet.pdf`);
}

// Function to fetch image as data URL
async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(`/api/fetch-image?url=${encodeURIComponent(imageUrl)}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('Image Data URL:', reader.result); // Log image data URL
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}

// Function to parse storyboard breakdown
function parseStoryboard(content: string): Storyboard {
  const lines = content.split('\n');
  const titleLine = lines.find(line => line.startsWith('### Storyboard Breakdown:'));
  const title = titleLine ? titleLine.replace('### Storyboard Breakdown:', '').trim() : '';

  const panels: Panel[] = [];
  let currentPanel: Panel | null = null;

  lines.forEach(line => {
    if (line.startsWith('#### Panel')) {
      if (currentPanel) {
        panels.push(currentPanel);
      }
      currentPanel = { title: '', description: '', notes: '', shotType: '' };
    } else if (currentPanel) {
      if (line.startsWith('- **Title**:')) {
        currentPanel.title = line.replace('- **Title**:', '').trim();
      } else if (line.startsWith('- **Description**:')) {
        currentPanel.description = line.replace('- **Description**:', '').trim();
      } else if (line.startsWith('- **Notes**:')) {
        currentPanel.notes = line.replace('- **Notes**:', '').trim();
      } else if (line.startsWith('- **Shot Type**:')) {
        currentPanel.shotType = line.replace('- **Shot Type**:', '').trim();
      }
    }
  });

  if (currentPanel) {
    panels.push(currentPanel);
  }

  return { title, panels };
}