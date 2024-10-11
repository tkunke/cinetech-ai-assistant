import jsPDF from 'jspdf';

interface Message {
  id: string;
  role?: string;
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

  // Assuming there's one breakdown message and multiple panel messages
  let breakdownMessage: Message | undefined;
  const selectedPanelMessages: Message[] = [];
  let storyboardName = "Shot Sheet"; // Default name

  // Separate the breakdown message and panel messages
  messages.forEach((message) => {
    if (hasImages(message.content)) {
      selectedPanelMessages.push(message);
    } else {
      breakdownMessage = message;
    }
  });

  if (!breakdownMessage || selectedPanelMessages.length === 0) {
    console.error('Required messages not found');
    console.log('Breakdown Message Found:', !!breakdownMessage);
    console.log('Panel Messages Found:', selectedPanelMessages.length);
    return;
  }

  const storyboard = parseStoryboard(breakdownMessage.content);

  const imagePattern = /!\[.*\]\((.*)\)/g;
  const imageUrls: string[] = [];

  // Extract the image URLs from the selected panel messages
  selectedPanelMessages.forEach((panelMessage) => {
    let match;
    while ((match = imagePattern.exec(panelMessage.content)) !== null) {
      imageUrls.push(match[1]);
    }
  });

  const pdf = new jsPDF();

  pdf.setFont("Helvetica", "normal");
  pdf.setFontSize(10);

  let y = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 10;
  const imageWidth = (pageWidth - 3 * margin) / 2;
  const imageHeight = imageWidth / 1.5;
  const textWidth = pageWidth / 2 - 2 * margin;

  // Ensure we are connecting the correct images with their respective panel descriptions
  for (let i = 0; i < storyboard.panels.length; i++) {
    const panel = storyboard.panels[i];
    const imageUrl = imageUrls[i]; // This will match the order of the panels

    // Combine the label and content for each heading into one block
    const combinedText = [
      `Title: ${panel.title}`,
      `Description: ${panel.description}`,
      `Notes: ${panel.notes}`,
      `Shot Type: ${panel.shotType}`,
    ];

    // Split and wrap the text within the available width
    const wrappedText = combinedText.flatMap((text) => pdf.splitTextToSize(text, textWidth));

    const textHeight = wrappedText.length * (pdf.getTextDimensions('Text').h + 2);
    const totalRowHeight = Math.max(textHeight, imageHeight) + 2 * margin;

    if (y + totalRowHeight > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      y = margin;
    }

    pdf.rect(margin, y, pageWidth - 2 * margin, totalRowHeight);

    const textX = margin + 2;
    let textY = y + margin;

    wrappedText.forEach((line: string) => {
      // Check if the line starts with a known label to make it bold
      if (line.startsWith("Title:") || line.startsWith("Description:") || line.startsWith("Notes:") || line.startsWith("Shot Type:")) {
        const parts = line.split(/:(.+)/); // Split at the first colon
        pdf.setFont("Helvetica", "bold");
        pdf.text(parts[0] + ":", textX, textY);
        pdf.setFont("Helvetica", "normal");
        pdf.text(parts[1].trim(), textX + pdf.getTextDimensions(parts[0] + ":").w + 2, textY);
      } else {
        pdf.setFont("Helvetica", "normal");
        pdf.text(line, textX, textY);
      }
      textY += pdf.getTextDimensions('Text').h + 2;
    });

    // Add the image corresponding to the panel
    if (imageUrl) {
      try {
        const imageData = await fetchImageAsDataUrl(imageUrl);
        const imageX = pageWidth / 2 + margin / 2 + 2;
        const imageY = y + margin;
        pdf.addImage(imageData, "PNG", imageX, imageY, imageWidth - 4, imageHeight - 4);
      } catch (error: any) {
        console.error(`Error loading image: ${error.message}`);
      }
    }

    y += totalRowHeight + margin;
  }

  // Save the PDF using the storyboard name
  const sanitizedFileName = storyboardName.replace(/[^\w\s-]/g, '').trim(); // Remove invalid characters
  pdf.save(`${sanitizedFileName}.pdf`);

  return sanitizedFileName;
}

// Function to fetch image as data URL
async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(`/api/fetch-image?url=${encodeURIComponent(imageUrl)}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
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
