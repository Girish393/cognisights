const fs = require('fs');
const file = '/app/applet/src/server/ai/gemini.ts';
let code = fs.readFileSync(file, 'utf8');

const retryLogic = `
async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      const isTransient = error.message?.includes("503") || error.message?.includes("UNAVAILABLE") || error.message?.includes("high demand") || error.status === 503;
      if (isTransient && attempt < maxRetries - 1) {
        attempt++;
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(\`Gemini API busy (503). Retrying in \${Math.round(delay)}ms... (Attempt \${attempt}/\${maxRetries})\`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Maximum retries reached");
}
`;

code = code.replace(
  'export async function parseQueryToStructured',
  retryLogic + '\nexport async function parseQueryToStructured'
);

code = code.replace(
  'response = await ai.models.generateContent({',
  'response = await withRetry(() => ai.models.generateContent({'
);

code = code.replace(
  '        },\n      },\n    });',
  '        },\n      },\n    }));'
);

code = code.replace(
  '  const response = await ai.models.generateContent({',
  '  const response = await withRetry(() => ai.models.generateContent({'
);

code = code.replace(
  '    },\n  });',
  '    },\n  }));'
);

fs.writeFileSync(file, code);
console.log('Patched gemini.ts');
