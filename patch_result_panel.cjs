const fs = require('fs');
const file = '/app/applet/src/components/ResultPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('import { Download } from "lucide-react";')) {
  code = `import { Download } from "lucide-react";\n` + code;
}

code = code.replace(
  /<label className="block text-\[11px\] font-bold text-slate-500 uppercase tracking-wider mb-4">Tool Outputs & Evidence<\/label>/g,
  `<div className="flex justify-between items-center mb-4">
        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tool Outputs & Evidence</label>
        {result && (
          <button 
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
              const downloadAnchorNode = document.createElement('a');
              downloadAnchorNode.setAttribute("href", dataStr);
              downloadAnchorNode.setAttribute("download", "satquery-evidence.json");
              document.body.appendChild(downloadAnchorNode);
              downloadAnchorNode.click();
              downloadAnchorNode.remove();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors"
          >
            <Download size={14} />
            Export Evidence
          </button>
        )}
      </div>`
);

fs.writeFileSync(file, code);
