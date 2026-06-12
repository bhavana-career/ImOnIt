const fs = require('fs');

const cssPath = "C:\\Users\\bhava\\OneDrive\\Documents\\Downloads\\I'm On It Bruh — AI Accountability Platform_files\\1vgkmwh5lbhnv.css";

try {
  const css = fs.readFileSync(cssPath, 'utf8');
  
  // Find strings around :root, .dark, or @media to see the exact structure
  // Let's search for --primary inside classes or selectors
  const selectors = [];
  const regex = /([^{}]+)\{([^{}]+)\}/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    const selector = match[1].trim();
    const rules = match[2].trim();
    if (rules.includes('--background') || rules.includes('--primary') || rules.includes('--accent')) {
      selectors.push({ selector, rules });
    }
  }
  
  console.log("=== Selectors containing variables ===");
  selectors.forEach(sel => {
    console.log(`Selector: ${sel.selector}`);
    // print only -- variables
    const vars = sel.rules.split(';').filter(r => r.trim().startsWith('--'));
    console.log("Variables:\n  " + vars.join('\n  '));
    console.log("------------------------");
  });
} catch (e) {
  console.error(e);
}
