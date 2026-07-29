import fs from 'fs';

const files = [
  'src/components/CreateRequestModal.tsx',
  'src/components/CreateOrderModal.tsx',
  'src/components/RequestDetailsModal.tsx',
  'src/components/OrderDetailsModal.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Insert state and handler
  if (!content.includes('const [modalWidth, setModalWidth] = useState')) {
    const importMatch = content.match(/import\s+{([^}]+)}\s+from\s+'react';/);
    if (importMatch && !importMatch[1].includes('useState')) {
        // usually useState is already imported
    }
    
    // Find the place to insert the state
    // We can just insert it after `export default function ...(...) {`
    const funcMatch = content.match(/export default function \w+\([^)]*\) \{/);
    if (funcMatch) {
      const stateInsert = `
  const [modalWidth, setModalWidth] = useState(1200);

  const handleResize = (e: React.MouseEvent, direction: 'left' | 'right') => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = modalWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = direction === 'right' ? moveEvent.clientX - startX : startX - moveEvent.clientX;
      setModalWidth(Math.max(800, Math.min(window.innerWidth * 0.95, startWidth + delta * 2)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };
`;
      content = content.replace(funcMatch[0], funcMatch[0] + '\n' + stateInsert);
    }
  }

  // Modify the modal container
  // Find `<motion.div \n initial={{ scale:` or similar
  const modalDivMatch = content.match(/className="relative bg-white w-full max-w-\[[^\]]+\] h-\[90vh\] rounded-3xl shadow-2xl flex flex-col overflow-hidden"/);
  
  if (modalDivMatch) {
    const newClass = 'className="relative bg-white w-full h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"';
    content = content.replace(modalDivMatch[0], `style={{ maxWidth: \`\${modalWidth}px\` }}\n            ${newClass}`);
  }

  // Insert the resize handles just after the modal div opening
  // Because it's an AnimatePresence wrapper or similar, we need to find the Header comment
  if (content.includes('{/* Header */}')) {
    const color = file.includes('Order') ? 'blue' : 'emerald';
    const handles = `
            {/* Resize Handles */}
            <div 
              className="absolute top-0 left-0 w-3 h-full cursor-col-resize z-50 hover:bg-${color}-500/20 transition-colors"
              onMouseDown={(e) => handleResize(e, 'left')}
            />
            <div 
              className="absolute top-0 right-0 w-3 h-full cursor-col-resize z-50 hover:bg-${color}-500/20 transition-colors"
              onMouseDown={(e) => handleResize(e, 'right')}
            />
            {/* Header */}`;
    content = content.replace('{/* Header */}', handles);
  }

  fs.writeFileSync(file, content);
  console.log('Patched', file);
}
