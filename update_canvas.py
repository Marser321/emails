import re

with open('app/src/components/CanvasEditor.tsx', 'r') as f:
    content = f.read()

# 1. Update injectAdsetImage
old_inject = """  const injectAdsetImage = (url: string) => {
    // If there's an active hero or image-text block, inject the URL there
    if (activeBlockId) {
      const block = blocks.find(b => b.id === activeBlockId);
      if (block && (block.type === 'hero' || block.type === 'image-text')) {
        updateBlock(activeBlockId, { imageUrl: url });
        return;
      }
    }
    // Otherwise, add a new hero block with this image
    const newBlock = createDefaultBlock('hero');
    (newBlock as { imageUrl: string }).imageUrl = url;
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
  };"""

new_inject = """  const injectAdsetImage = (url: string) => {
    // If there's an active block, inject the URL there if supported
    if (activeBlockId) {
      const block = blocks.find(b => b.id === activeBlockId);
      if (block) {
        if (block.type === 'hero' || block.type === 'image-text') {
          updateBlock(activeBlockId, { imageUrl: url });
          return;
        } else if (block.type === 'gallery') {
          // Find first empty image slot or push new
          const images = [...block.images];
          const emptyIdx = images.findIndex(img => !img.url);
          if (emptyIdx !== -1) {
            images[emptyIdx] = { ...images[emptyIdx], url };
          } else {
            images.push({ url });
          }
          updateBlock(activeBlockId, { images });
          return;
        }
      }
    }
    // Otherwise, add a new hero block with this image
    const newBlock = createDefaultBlock('hero');
    (newBlock as { imageUrl: string }).imageUrl = url;
    setBlocks([...blocks, newBlock]);
    setActiveBlockId(newBlock.id);
  };"""

content = content.replace(old_inject, new_inject)

# 2. Update drag & drop handles
old_dragstart = """  const handleDragStart = (idx: number) => {
    setDragIndex(idx);
  };"""

new_dragstart = """  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx.toString());
  };"""

content = content.replace(old_dragstart, new_dragstart)

# In the render loop for draggable:
old_ondragstart = """                onDragStart={() => handleDragStart(index)}"""
new_ondragstart = """                onDragStart={(e) => handleDragStart(e, index)}"""

content = content.replace(old_ondragstart, new_ondragstart)

# 3. Replace inputStyles
content = content.replace("style={inputStyle}", 'className="form-input"')
content = content.replace("style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}", 'className="form-input" style={{ minHeight: 80, resize: \'vertical\' }}')
content = content.replace("style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}", 'className="form-input" style={{ minHeight: 60, resize: \'vertical\' }}')
content = content.replace("style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }}", 'className="form-input" style={{ minHeight: 50, resize: \'vertical\' }}')
content = content.replace("style={{ ...inputStyle, flex: 1 }}", 'className="form-input" style={{ flex: 1 }}')

# Remove inputStyle definition
old_inputstyle_def = """  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: '1px solid transparent',
    transition: 'all var(--transition-fast)',
  };"""

content = content.replace(old_inputstyle_def, "")

with open('app/src/components/CanvasEditor.tsx', 'w') as f:
    f.write(content)
