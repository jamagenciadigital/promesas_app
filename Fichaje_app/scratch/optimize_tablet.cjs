const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = fs.statSync(dirFile).isDirectory() ? walkSync(dirFile, filelist) : filelist.concat(dirFile);
    } catch (err) {
      if (err.code === 'OOM' || err.code === 'EMFILE') throw err;
    }
  });
  return filelist;
};

const files = walkSync('/Users/jam/Documents/Fichaje_app/src');
let changedFiles = 0;

files.forEach(file => {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Grid cols optimizations for tablet (moving 3/4/5 cols to lg, keeping md as 2 cols)
    content = content.replace(/md:grid-cols-3/g, 'md:grid-cols-2 lg:grid-cols-3');
    content = content.replace(/md:grid-cols-4/g, 'md:grid-cols-2 lg:grid-cols-4');
    content = content.replace(/md:grid-cols-5/g, 'md:grid-cols-2 lg:grid-cols-5');
    // For already fixed ones (like md:grid-cols-2 lg:grid-cols-2 lg:grid-cols-3), we should be careful.
    // Let's do a simple dedup
    content = content.replace(/md:grid-cols-2 md:grid-cols-2/g, 'md:grid-cols-2');
    content = content.replace(/md:grid-cols-2 lg:grid-cols-3 lg:grid-cols-3/g, 'md:grid-cols-2 lg:grid-cols-3');
    content = content.replace(/md:grid-cols-2 lg:grid-cols-4 lg:grid-cols-4/g, 'md:grid-cols-2 lg:grid-cols-4');
    content = content.replace(/md:grid-cols-2 lg:grid-cols-5 lg:grid-cols-5/g, 'md:grid-cols-2 lg:grid-cols-5');

    // Flex row without wrap is a big issue on tablets
    // We will replace md:flex-row with md:flex-row flex-wrap, 
    // EXCEPT if it already has flex-wrap
    // It's tricky to do via regex perfectly, but we can look for standard flex declarations
    // Actually, replacing `md:flex-row` with `md:flex-row md:flex-wrap` is safer so it wraps on tablet.
    // Or just `flex-wrap` next to it. Let's do `md:flex-row flex-wrap` if flex-wrap isn't in the same line.
    const lines = content.split('\n');
    const newLines = lines.map(line => {
      if (line.includes('md:flex-row') && !line.includes('flex-wrap') && !line.includes('flex-nowrap')) {
         return line.replace(/md:flex-row/g, 'md:flex-row md:flex-wrap lg:flex-nowrap');
      }
      return line;
    });
    content = newLines.join('\n');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      changedFiles++;
    }
  }
});

console.log(`Optimized ${changedFiles} files for tablet responsiveness.`);
