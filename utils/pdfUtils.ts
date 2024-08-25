import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { marked } from 'marked';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const mapHtmlToPdfMake = (node: HTMLElement): any[] => {
    const content: any[] = [];
    
    node.childNodes.forEach((child: ChildNode) => {
      if (child instanceof HTMLElement) {
        switch (child.nodeName.toLowerCase()) {
          case 'p':
            content.push({ text: mapHtmlToPdfMake(child), margin: [0, 5] });
            break;
          case 'strong':
            content.push({ text: mapHtmlToPdfMake(child), bold: true });
            break;
          case 'em':
            content.push({ text: mapHtmlToPdfMake(child), italics: true });
            break;
          case 'h1':
            content.push({ text: mapHtmlToPdfMake(child), style: 'header1' });
            break;
          case 'h2':
            content.push({ text: mapHtmlToPdfMake(child), style: 'header2' });
            break;
          case 'h3':
            content.push({ text: mapHtmlToPdfMake(child), style: 'header3' });
            break;
          case 'ul':
            const ulItems = Array.from(child.children).map((li) => ({
              text: mapHtmlToPdfMake(li as HTMLElement),
              margin: [0, 2],
            }));
            content.push({ ul: ulItems });
            break;
          case 'ol':
            const olItems = Array.from(child.children).map((li) => ({
              text: mapHtmlToPdfMake(li as HTMLElement),
              margin: [0, 2],
            }));
            content.push({ ol: olItems });
            break;
          case 'blockquote':
            content.push({ text: mapHtmlToPdfMake(child), style: 'blockquote' });
            break;
          case 'li':
            content.push({ text: mapHtmlToPdfMake(child), margin: [0, 2] });
            break;
          default:
            // This case handles generic elements
            if (child.textContent) {
              content.push({ text: child.textContent });
            }
        }
      }
    });
    
    return content;
};  
  

export const generatePdfFromMarkdown = (markdownContent: string): void => {
  const htmlContent = marked(markdownContent);
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const content = mapHtmlToPdfMake(doc.body);

  const docDefinition = {
    content: content,
    styles: {
      header1: { fontSize: 22, bold: true },
      header2: { fontSize: 20, bold: true },
      header3: { fontSize: 18, bold: true },
      blockquote: { italics: true, alignment: 'center' as const, margin: [10, 10, 10, 10] as [number, number, number, number] },
    },
  };

  pdfMake.createPdf(docDefinition).download('message.pdf');
};
